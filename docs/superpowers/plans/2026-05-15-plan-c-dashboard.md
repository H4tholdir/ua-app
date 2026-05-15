# UÀ — Piano C: Dashboard "OGGI" RBAC-Aware

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Prerequisiti:** Piano A completato (migrations 005 applicate, bug cliente_id fixato).
Piano B completato (lavori_partitario popolabile — necessario per query pagamenti scaduti).

**Goal:** Costruire la dashboard operativa principale con 3 viste diverse per ruolo
(titolare/admin_rete, tecnico, front_desk). È la killer feature di UÀ — la prima
schermata aperta ogni mattina dal laboratorio.

**Dipendenze critiche:**
- `lavori_partitario` esiste (creata in migration 002) — Plan C calcola i saldi su di essa
- `magazzino` con `scorta_attuale`/`scorta_minima` esiste (schema.sql) — Plan C la interroga
- `dashboard_kpi_cache` esiste (migration 002) ma **mancano colonne** (vedi Task 1)
- pg_cron NON è ancora configurato — Plan C lo aggiunge per la prima volta

**Nota su `getServiceClient` vs RLS:** La dashboard page usa `getServiceClient` (bypass RLS).
Il confine di sicurezza tenant è garantito dall'`auth.getUser()` iniziale + il filtro esplicito
`.eq('laboratorio_id', labId)` su ogni query, dove `labId` è derivato server-side dall'`user.id`
autenticato. RLS è un secondo strato di difesa, non il primario in questo contesto.

**Strategia RBAC per i dati:**
| Ruolo | Fonte dati |
|---|---|
| `titolare`, `admin_rete` | `dashboard_kpi_cache` (extended) — aggiornata ogni 15 min |
| `tecnico` | Query dirette filtrate per `tecnico_id = utente.tecnico_id` — no cache |
| `front_desk` | Query dirette (consegne giornaliere + ritiri + scaduti >30gg) — no cache |

La cache è keyed by `laboratorio_id` (una riga per lab). Non si prova a cachecare
dati per-tecnico o per-ruolo — non scalabile in quella struttura.

**Approvazione UI obbligatoria:** Nessun componente React viene scritto prima che Francesco
abbia approvato i mockup HTML (CLAUDE.md §5 — regola assoluta). Il Task 1 copre il DB,
il Task 2 produce i mockup, i Task 3-7 producono il codice.

**Tech Stack:** Next.js 16 App Router, Supabase (RLS), TypeScript, Vitest 4.x, Playwright 1.60

---

## Mappa File

| File | Tipo | Responsabilità |
|---|---|---|
| `supabase/migrations/006_dashboard_extended_kpi.sql` | CREATE | Colonne mancanti + refresh_dashboard_cache() estesa + pg_cron |
| `src/types/domain.ts` | MODIFY | Nuovi tipi `TecnicoDashboard`, `FrontDeskDashboard`, estende `DashboardStats` |
| `src/lib/dashboard/queries.ts` | CREATE | Funzioni pure testabili: `getTitolareKpi`, `getTecnicoDashboard`, `getFrontDeskDashboard` |
| `src/lib/dashboard/cache-stale.ts` | CREATE | Logica staleness 15-min + trigger refresh on-demand |
| `src/app/api/dashboard/kpi/route.ts` | MODIFY | RBAC routing + query reali via queries.ts + cache stale check |
| `src/app/(app)/dashboard/page.tsx` | MODIFY | RBAC: router a DashboardTitolare / DashboardTecnico / DashboardFrontDesk |
| `src/components/features/dashboard/DashboardTitolare.tsx` | CREATE | Vista titolare con 6 sezioni |
| `src/components/features/dashboard/DashboardTecnico.tsx` | CREATE | Vista tecnico con 4 sezioni |
| `src/components/features/dashboard/DashboardFrontDesk.tsx` | CREATE | Vista front desk con 4 sezioni |
| `src/components/features/dashboard/KpiCard.tsx` | CREATE | Card KPI riutilizzabile (valore + label + color + icon) |
| `src/components/features/dashboard/LavoroUrgente.tsx` | CREATE | Row lavoro urgente/in ritardo per tutte le viste |
| `tests/unit/dashboard-kpi.test.ts` | CREATE | Unit test per queries.ts e cache-stale.ts |
| `tests/e2e/dashboard.spec.ts` | CREATE | E2E RBAC routing per tutti e 3 i ruoli |

---

## Task 0: Design Approval — Mockup HTML

**REGOLA ASSOLUTA (CLAUDE.md §5):** Prima di scrivere qualsiasi riga di React,
creare mockup HTML/CSS puro in `/tmp/`, fare screenshot via Playwright, e aspettare
approvazione esplicita di Francesco. Solo dopo si passa al Task 3.

**Files:**
- Create: `/tmp/ua-dashboard-titolare.html`
- Create: `/tmp/ua-dashboard-tecnico.html`
- Create: `/tmp/ua-dashboard-frontdesk.html`

- [ ] **0.1 Crea mockup HTML — vista TITOLARE**

```html
<!-- /tmp/ua-dashboard-titolare.html -->
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UÀ Dashboard — Titolare</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@700&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: #0F1E52;
      min-height: 100vh;
      font-family: 'DM Sans', sans-serif;
      color: #F0F4FF;
      max-width: 430px;
      margin: 0 auto;
    }

    /* ─── Shadow tokens ─────────────────── */
    .raised {
      box-shadow: -3px -3px 7px hsl(220 80% 35% / 0.55),
                   5px 5px 14px hsl(230 100% 4% / 0.95);
    }
    .pressed {
      box-shadow: inset 3px 3px 8px hsl(230 100% 4% / 0.8),
                  inset -2px -2px 6px hsl(220 80% 35% / 0.4);
    }

    /* ─── Header ────────────────────────── */
    .header {
      display: flex;
      align-items: center;
      padding: 20px 20px 12px;
      gap: 12px;
    }
    .header-text h1 {
      font-family: 'DM Sans', sans-serif;
      font-size: 20px;
      font-weight: 700;
      color: #F0F4FF;
    }
    .header-text p {
      font-size: 13px;
      color: #8899CC;
      margin-top: 2px;
    }

    /* ─── Section label ─────────────────── */
    .section-label {
      font-size: 11px;
      font-weight: 600;
      color: #8899CC;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 16px 20px 8px;
    }

    /* ─── KPI Strip ─────────────────────── */
    .kpi-strip {
      display: flex;
      gap: 8px;
      padding: 0 20px 16px;
      overflow-x: auto;
      scrollbar-width: none;
    }
    .kpi-chip {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #1B2D6B;
      border-radius: 16px;
      padding: 12px 14px;
      min-width: 76px;
      flex-shrink: 0;
    }
    .kpi-chip .value {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 24px;
      font-weight: 700;
      line-height: 1;
    }
    .kpi-chip .label {
      font-size: 10px;
      font-weight: 500;
      color: #8899CC;
      margin-top: 4px;
      letter-spacing: 0.02em;
    }

    /* ─── Card ──────────────────────────── */
    .card {
      background: #1B2D6B;
      border-radius: 20px;
      margin: 0 20px 10px;
      overflow: hidden;
    }
    .card-row {
      display: flex;
      align-items: center;
      padding: 14px 16px;
      gap: 12px;
      text-decoration: none;
      color: inherit;
      border-bottom: 1px solid rgba(136,153,204,0.12);
    }
    .card-row:last-child { border-bottom: none; }

    .stato-bar {
      width: 4px;
      border-radius: 2px;
      flex-shrink: 0;
      align-self: stretch;
      min-height: 44px;
    }

    .row-main { flex: 1; min-width: 0; }
    .row-main .dentista {
      font-size: 15px;
      font-weight: 600;
      color: #F0F4FF;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .row-main .meta {
      display: flex;
      justify-content: space-between;
      margin-top: 3px;
    }
    .row-main .num {
      font-size: 12px;
      font-weight: 600;
      color: #8899CC;
    }
    .row-main .ora {
      font-size: 12px;
      font-weight: 500;
      color: #D4A843;
    }

    /* ─── Pagamenti warning card ────────── */
    .pagamenti-card {
      background: #1B2D6B;
      border-radius: 20px;
      margin: 0 20px 10px;
      padding: 16px;
    }
    .pagamenti-total {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .pagamenti-total .amount {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 28px;
      font-weight: 700;
      color: #FA5252;
    }
    .pagamenti-total .label {
      font-size: 13px;
      color: #8899CC;
    }
    .cliente-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-top: 1px solid rgba(136,153,204,0.12);
    }
    .cliente-row .nome { font-size: 14px; font-weight: 500; color: #F0F4FF; }
    .cliente-row .importo { font-size: 14px; font-weight: 700; color: #FA5252; }

    /* ─── Fatturato comparativo ──────────── */
    .fatturato-card {
      background: #1B2D6B;
      border-radius: 20px;
      margin: 0 20px 10px;
      padding: 16px;
      display: flex;
      gap: 16px;
    }
    .fatturato-col { flex: 1; }
    .fatturato-col .mese-label {
      font-size: 11px;
      font-weight: 500;
      color: #8899CC;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 6px;
    }
    .fatturato-col .importo {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 26px;
      font-weight: 700;
    }
    .fatturato-col .delta {
      font-size: 12px;
      font-weight: 600;
      margin-top: 4px;
    }
    .delta-up { color: #2ECC9A; }
    .delta-down { color: #FA5252; }

    /* ─── Material warning ──────────────── */
    .material-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-bottom: 1px solid rgba(136,153,204,0.12);
    }
    .material-row:last-child { border-bottom: none; }
    .material-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #FA5252;
      flex-shrink: 0;
    }
    .material-nome { font-size: 14px; font-weight: 500; color: #F0F4FF; flex: 1; }
    .material-scorta { font-size: 13px; font-weight: 600; color: #FA5252; }

    /* ─── Bottom nav placeholder ────────── */
    .bottom-nav {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      max-width: 430px;
      margin: 0 auto;
      height: 68px;
      background: rgba(15, 30, 82, 0.96);
      backdrop-filter: blur(12px);
      border-top: 1px solid rgba(136,153,204,0.15);
    }

    .bottom-spacer { height: 88px; }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="header">
    <div class="header-text">
      <h1>Buongiorno, Filippo</h1>
      <p>Lab Opromolla — giovedì 15 maggio 2026</p>
    </div>
  </div>

  <!-- KPI STRIP -->
  <div class="section-label">Situazione operativa</div>
  <div class="kpi-strip">
    <div class="kpi-chip raised">
      <span class="value" style="color:#FA5252">3</span>
      <span class="label">In ritardo</span>
    </div>
    <div class="kpi-chip raised">
      <span class="value" style="color:#4C6EF5">7</span>
      <span class="label">Oggi</span>
    </div>
    <div class="kpi-chip raised">
      <span class="value" style="color:#FD7E14">2</span>
      <span class="label">In prova</span>
    </div>
    <div class="kpi-chip raised">
      <span class="value" style="color:#D4A843">5</span>
      <span class="label">Da fatt.</span>
    </div>
    <div class="kpi-chip raised">
      <span class="value" style="color:#FA5252">2</span>
      <span class="label">Materiali</span>
    </div>
  </div>

  <!-- DA CONSEGNARE OGGI -->
  <div class="section-label">Da consegnare oggi</div>
  <div class="card raised">
    <a class="card-row" href="#">
      <div class="stato-bar" style="background:#2ECC9A"></div>
      <div class="row-main">
        <div class="dentista">Studio Dentistico Rossi</div>
        <div class="meta">
          <span class="num">#2026/0041</span>
          <span class="ora">ore 09:30</span>
        </div>
      </div>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="#8899CC" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </a>
    <a class="card-row" href="#">
      <div class="stato-bar" style="background:#2ECC9A"></div>
      <div class="row-main">
        <div class="dentista">Dr. Carmine Esposito</div>
        <div class="meta">
          <span class="num">#2026/0038</span>
          <span class="ora">ore 11:00</span>
        </div>
      </div>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="#8899CC" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </a>
    <a class="card-row" href="#">
      <div class="stato-bar" style="background:#FD7E14"></div>
      <div class="row-main">
        <div class="dentista">Studio Perrotta</div>
        <div class="meta">
          <span class="num">#2026/0043</span>
          <span class="ora">pomeriggio</span>
        </div>
      </div>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="#8899CC" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </a>
  </div>

  <!-- IN PROVA — RIENTRO ATTESO -->
  <div class="section-label">In prova esterna — rientro atteso</div>
  <div class="card raised">
    <a class="card-row" href="#">
      <div class="stato-bar" style="background:#FD7E14"></div>
      <div class="row-main">
        <div class="dentista">Dr. Mario Ferraro</div>
        <div class="meta">
          <span class="num">#2026/0036 · Corona in zirconio</span>
          <span class="ora">rientra oggi</span>
        </div>
      </div>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="#8899CC" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </a>
    <a class="card-row" href="#">
      <div class="stato-bar" style="background:#FD7E14"></div>
      <div class="row-main">
        <div class="dentista">Studio Napolitano</div>
        <div class="meta">
          <span class="num">#2026/0031 · Protesi mobile</span>
          <span class="ora">ven 16 mag</span>
        </div>
      </div>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="#8899CC" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </a>
  </div>

  <!-- MATERIALI IN ESAURIMENTO -->
  <div class="section-label">Materiali in esaurimento</div>
  <div class="card raised">
    <div class="material-row">
      <div class="material-dot"></div>
      <span class="material-nome">Ceramica feldpatica IPS e.max</span>
      <span class="material-scorta">1.2 / 5.0 kg</span>
    </div>
    <div class="material-row">
      <div class="material-dot" style="background:#FD7E14"></div>
      <span class="material-nome">Cera da modellazione Renfert</span>
      <span class="material-scorta" style="color:#FD7E14">2.0 / 3.0 pz</span>
    </div>
  </div>

  <!-- PAGAMENTI SCADUTI -->
  <div class="section-label">Pagamenti scaduti</div>
  <div class="pagamenti-card raised">
    <div class="pagamenti-total">
      <div>
        <div class="label">Totale insoluto</div>
        <div class="amount">€ 4.820</div>
      </div>
      <div style="background:rgba(250,82,82,0.12);border-radius:12px;padding:8px 14px;text-align:center">
        <div style="font-size:22px;font-weight:700;font-family:'Playfair Display',serif;color:#FA5252">3</div>
        <div style="font-size:10px;color:#8899CC;margin-top:2px">clienti</div>
      </div>
    </div>
    <div class="cliente-row">
      <span class="nome">Studio Greco</span>
      <span class="importo">€ 2.150</span>
    </div>
    <div class="cliente-row">
      <span class="nome">Dr. Caserta</span>
      <span class="importo">€ 1.470</span>
    </div>
    <div class="cliente-row">
      <span class="nome">Studio De Luca</span>
      <span class="importo">€ 1.200</span>
    </div>
  </div>

  <!-- FATTURATO COMPARATIVO -->
  <div class="section-label">Fatturato</div>
  <div class="fatturato-card raised">
    <div class="fatturato-col">
      <div class="mese-label">Maggio 2026</div>
      <div class="importo" style="color:#F0F4FF">€ 12.340</div>
      <div class="delta delta-up">+18% vs apr</div>
    </div>
    <div style="width:1px;background:rgba(136,153,204,0.2);margin:4px 0"></div>
    <div class="fatturato-col">
      <div class="mese-label">Aprile 2026</div>
      <div class="importo" style="color:#8899CC">€ 10.460</div>
    </div>
  </div>

  <div class="bottom-spacer"></div>
  <div class="bottom-nav"></div>
</body>
</html>
```

- [ ] **0.2 Crea mockup HTML — vista TECNICO**

```html
<!-- /tmp/ua-dashboard-tecnico.html -->
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UÀ Dashboard — Tecnico</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0F1E52;
      min-height: 100vh;
      font-family: 'DM Sans', sans-serif;
      color: #F0F4FF;
      max-width: 430px;
      margin: 0 auto;
    }
    .raised {
      box-shadow: -3px -3px 7px hsl(220 80% 35% / 0.55),
                   5px 5px 14px hsl(230 100% 4% / 0.95);
    }
    .header { padding: 20px 20px 12px; }
    .header h1 { font-size: 20px; font-weight: 700; color: #F0F4FF; }
    .header p { font-size: 13px; color: #8899CC; margin-top: 2px; }
    .section-label {
      font-size: 11px; font-weight: 600; color: #8899CC;
      text-transform: uppercase; letter-spacing: 0.08em;
      padding: 16px 20px 8px;
    }
    .card { background: #1B2D6B; border-radius: 20px; margin: 0 20px 10px; overflow: hidden; }
    .card-row {
      display: flex; align-items: center; padding: 14px 16px; gap: 12px;
      text-decoration: none; color: inherit;
      border-bottom: 1px solid rgba(136,153,204,0.12);
    }
    .card-row:last-child { border-bottom: none; }
    .stato-bar { width: 4px; border-radius: 2px; flex-shrink: 0; align-self: stretch; min-height: 44px; }
    .row-main { flex: 1; min-width: 0; }
    .row-main .dentista { font-size: 15px; font-weight: 600; color: #F0F4FF; }
    .row-main .meta { display: flex; justify-content: space-between; margin-top: 3px; }
    .row-main .desc { font-size: 12px; color: #8899CC; }
    .row-main .scad { font-size: 12px; font-weight: 600; color: #D4A843; }

    /* Progress bar */
    .progress-wrap { background: rgba(136,153,204,0.15); border-radius: 4px; height: 6px; margin-top: 8px; }
    .progress-bar { height: 6px; border-radius: 4px; background: #4C6EF5; }

    /* Fase badge */
    .fase-badge {
      background: rgba(76,110,245,0.15);
      border: 1px solid rgba(76,110,245,0.3);
      border-radius: 10px;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 600;
      color: #4C6EF5;
      margin: 0 16px 14px;
      display: inline-block;
    }

    .bottom-spacer { height: 88px; }
    .bottom-nav {
      position: fixed; bottom: 0; left: 0; right: 0; max-width: 430px;
      margin: 0 auto; height: 68px;
      background: rgba(15, 30, 82, 0.96);
      backdrop-filter: blur(12px);
      border-top: 1px solid rgba(136,153,204,0.15);
    }
    .urgente-tag {
      font-size: 10px; font-weight: 700; color: #FA5252;
      background: rgba(250,82,82,0.12); border-radius: 6px;
      padding: 2px 8px; text-transform: uppercase; letter-spacing: 0.04em;
      flex-shrink: 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Ciao, Giovanni</h1>
    <p>I tuoi lavori di oggi — giovedì 15 maggio</p>
  </div>

  <div class="section-label">Urgenti / in ritardo</div>
  <div class="card raised">
    <a class="card-row" href="#">
      <div class="stato-bar" style="background:#FA5252"></div>
      <div class="row-main">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span class="dentista">Studio Rossi</span>
          <span class="urgente-tag">In ritardo</span>
        </div>
        <div class="meta">
          <span class="desc">#2026/0028 · Corona PFM</span>
          <span class="scad" style="color:#FA5252">scad. ieri</span>
        </div>
      </div>
    </a>
    <a class="card-row" href="#">
      <div class="stato-bar" style="background:#FD7E14"></div>
      <div class="row-main">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span class="dentista">Dr. Esposito</span>
          <span class="urgente-tag" style="color:#FD7E14;background:rgba(253,126,20,0.12)">Urgente</span>
        </div>
        <div class="meta">
          <span class="desc">#2026/0044 · Scheletrato</span>
          <span class="scad">scad. oggi</span>
        </div>
      </div>
    </a>
  </div>

  <div class="section-label">Lavori assegnati oggi</div>
  <div class="card raised">
    <div style="padding: 14px 16px; border-bottom: 1px solid rgba(136,153,204,0.12)">
      <div style="display:flex;align-items:center;gap:12px">
        <div class="stato-bar" style="background:#4C6EF5;align-self:auto;height:44px"></div>
        <div class="row-main">
          <div class="dentista">Studio Napolitano</div>
          <div class="meta">
            <span class="desc">#2026/0041 · Impianto</span>
            <span class="scad">consegna ven 16</span>
          </div>
          <div class="progress-wrap">
            <div class="progress-bar" style="width:60%"></div>
          </div>
        </div>
      </div>
      <div class="fase-badge">Prossima fase: Glassatura ceramica</div>
    </div>
    <div style="padding: 14px 16px;">
      <div style="display:flex;align-items:center;gap:12px">
        <div class="stato-bar" style="background:#4C6EF5;align-self:auto;height:44px"></div>
        <div class="row-main">
          <div class="dentista">Dr. Ferrari</div>
          <div class="meta">
            <span class="desc">#2026/0039 · Protesi fissa 3 elem.</span>
            <span class="scad">consegna lun 19</span>
          </div>
          <div class="progress-wrap">
            <div class="progress-bar" style="width:30%"></div>
          </div>
        </div>
      </div>
      <div class="fase-badge">Prossima fase: Pressofusione</div>
    </div>
  </div>

  <div class="section-label">Miei lavori in prova — rientrano oggi</div>
  <div class="card raised">
    <a class="card-row" href="#">
      <div class="stato-bar" style="background:#FD7E14"></div>
      <div class="row-main">
        <div class="dentista">Studio Greco</div>
        <div class="meta">
          <span class="desc">#2026/0036 · Corona in zirconio</span>
          <span class="scad" style="color:#FD7E14">atteso oggi</span>
        </div>
      </div>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="#8899CC" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </a>
  </div>

  <div class="bottom-spacer"></div>
  <div class="bottom-nav"></div>
</body>
</html>
```

- [ ] **0.3 Crea mockup HTML — vista FRONT DESK**

```html
<!-- /tmp/ua-dashboard-frontdesk.html -->
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UÀ Dashboard — Front Desk</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0F1E52; min-height: 100vh;
      font-family: 'DM Sans', sans-serif; color: #F0F4FF;
      max-width: 430px; margin: 0 auto;
    }
    .raised {
      box-shadow: -3px -3px 7px hsl(220 80% 35% / 0.55),
                   5px 5px 14px hsl(230 100% 4% / 0.95);
    }
    .header { padding: 20px 20px 12px; }
    .header h1 { font-size: 20px; font-weight: 700; color: #F0F4FF; }
    .header p { font-size: 13px; color: #8899CC; margin-top: 2px; }
    .section-label {
      font-size: 11px; font-weight: 600; color: #8899CC;
      text-transform: uppercase; letter-spacing: 0.08em; padding: 16px 20px 8px;
    }
    .card { background: #1B2D6B; border-radius: 20px; margin: 0 20px 10px; overflow: hidden; }
    .card-row {
      display: flex; align-items: center; padding: 14px 16px; gap: 12px;
      text-decoration: none; color: inherit;
      border-bottom: 1px solid rgba(136,153,204,0.12);
    }
    .card-row:last-child { border-bottom: none; }
    .stato-bar { width: 4px; border-radius: 2px; flex-shrink: 0; align-self: stretch; min-height: 44px; }
    .row-main { flex: 1; min-width: 0; }
    .dentista { font-size: 15px; font-weight: 600; color: #F0F4FF; }
    .meta { display: flex; justify-content: space-between; margin-top: 3px; }
    .num { font-size: 12px; font-weight: 600; color: #8899CC; }
    .ora { font-size: 12px; font-weight: 500; color: #D4A843; }

    /* Contatti scaduti */
    .contatta-badge {
      display: inline-flex; align-items: center; gap: 6px;
      background: rgba(250,82,82,0.12); border-radius: 10px;
      padding: 8px 14px; margin: 12px 16px;
      font-size: 13px; font-weight: 600; color: #FA5252;
    }

    .empty {
      background: #1B2D6B; border-radius: 20px; margin: 0 20px 10px;
      padding: 28px 20px; text-align: center;
      box-shadow: -2px -2px 5px hsl(220 80% 35% / 0.4), 3px 3px 8px hsl(230 100% 4% / 0.8);
    }
    .empty p { font-size: 14px; color: #8899CC; }

    .bottom-spacer { height: 88px; }
    .bottom-nav {
      position: fixed; bottom: 0; left: 0; right: 0; max-width: 430px; margin: 0 auto;
      height: 68px; background: rgba(15, 30, 82, 0.96);
      backdrop-filter: blur(12px); border-top: 1px solid rgba(136,153,204,0.15);
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Ciao, Maria</h1>
    <p>Ricezione — giovedì 15 maggio 2026</p>
  </div>

  <div class="section-label">Da consegnare oggi</div>
  <div class="card raised">
    <a class="card-row" href="#">
      <div class="stato-bar" style="background:#2ECC9A"></div>
      <div class="row-main">
        <div class="dentista">Studio Rossi</div>
        <div class="meta">
          <span class="num">#2026/0041 · Corona ceramica</span>
          <span class="ora">ore 09:30</span>
        </div>
      </div>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="#8899CC" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </a>
    <a class="card-row" href="#">
      <div class="stato-bar" style="background:#FD7E14"></div>
      <div class="row-main">
        <div class="dentista">Dr. Esposito</div>
        <div class="meta">
          <span class="num">#2026/0038 · Scheletrato</span>
          <span class="ora">ore 11:00</span>
        </div>
      </div>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="#8899CC" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </a>
  </div>

  <div class="section-label">Ritiri attesi oggi (nuovi lavori)</div>
  <div class="card raised">
    <a class="card-row" href="#">
      <div class="stato-bar" style="background:#4C6EF5"></div>
      <div class="row-main">
        <div class="dentista">Studio Perrotta</div>
        <div class="meta">
          <span class="num">Attesa impronta + RX</span>
          <span class="ora">ore 15:00</span>
        </div>
      </div>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="#8899CC" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </a>
  </div>

  <div class="section-label">In prova — rientrano oggi</div>
  <div class="card raised">
    <a class="card-row" href="#">
      <div class="stato-bar" style="background:#FD7E14"></div>
      <div class="row-main">
        <div class="dentista">Dr. Mario Ferraro</div>
        <div class="meta">
          <span class="num">#2026/0036 · Corona in zirconio</span>
          <span class="ora" style="color:#FD7E14">attesa oggi</span>
        </div>
      </div>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="#8899CC" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </a>
  </div>

  <div class="section-label">Da contattare (insoluto >30gg)</div>
  <div class="card raised">
    <div class="card-row" style="flex-direction:column;align-items:flex-start;gap:4px">
      <div style="display:flex;width:100%;justify-content:space-between;align-items:center">
        <span class="dentista">Studio Greco</span>
        <span style="font-size:14px;font-weight:700;color:#FA5252">€ 2.150</span>
      </div>
      <span style="font-size:12px;color:#8899CC">Scaduto da 47 giorni · 3 lavori</span>
    </div>
    <div class="card-row" style="flex-direction:column;align-items:flex-start;gap:4px">
      <div style="display:flex;width:100%;justify-content:space-between;align-items:center">
        <span class="dentista">Dr. Caserta</span>
        <span style="font-size:14px;font-weight:700;color:#FA5252">€ 1.470</span>
      </div>
      <span style="font-size:12px;color:#8899CC">Scaduto da 38 giorni · 2 lavori</span>
    </div>
    <a class="contatta-badge" href="https://wa.me/39...">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382..."/></svg>
      Contatta via WhatsApp
    </a>
  </div>

  <div class="bottom-spacer"></div>
  <div class="bottom-nav"></div>
</body>
</html>
```

- [ ] **0.4 Screenshot e attesa approvazione**

```bash
# Salva i mockup in /tmp/ e apri in browser per review
open /tmp/ua-dashboard-titolare.html
open /tmp/ua-dashboard-tecnico.html
open /tmp/ua-dashboard-frontdesk.html
```

**STOP — attendi approvazione esplicita di Francesco prima di procedere al Task 2.**

---

## Task 1: Migration SQL — Extended Dashboard KPI

**Dipendenza:** Piano A (migration 005) applicata. Migration da creare: `006_dashboard_extended_kpi.sql`.
Verificato: ultima migration esistente è `004_fix_consegna_lock.sql` + `20260514_mdr_qualita.sql`.
Il file si chiama `006_dashboard_extended_kpi.sql` perché segue la sequenza numerica convenzionale.

**Files:**
- Create: `supabase/migrations/006_dashboard_extended_kpi.sql`

- [ ] **1.1 Scrivi il test che verifica la struttura delle query SQL pure (pre-migration)**

Il test non può girare senza DB reale, quindi verifica le funzioni pure di mapping
dei risultati che i componenti useranno. Questo test guida il design delle funzioni
in queries.ts.

```typescript
// tests/unit/dashboard-kpi.test.ts
import { describe, it, expect } from 'vitest'
import {
  mapTitolareKpiRow,
  mapTecnicoLavoriRows,
  mapFrontDeskConsegneRows,
  isCacheStale,
} from '@/lib/dashboard/queries'

describe('mapTitolareKpiRow', () => {
  it('fallback su valori mancanti', () => {
    const result = mapTitolareKpiRow(null)
    expect(result.lavori_in_ritardo).toBe(0)
    expect(result.fatturato_mese).toBe(0)
    expect(result.fatturato_mese_precedente).toBe(0)
    expect(result.pagamenti_scaduti_totale).toBe(0)
    expect(result.materiali_esaurimento_count).toBe(0)
  })

  it('mappa correttamente una riga cache completa', () => {
    const row = {
      laboratorio_id: 'lab-001',
      consegne_oggi: 5,
      lavori_in_ritardo: 2,
      pronti_non_fatturati: 3,
      mdr_incompleti: 1,
      spedizioni_in_ritardo: 0,
      is_rifacimento_count: 1,
      stl_non_assegnati: 0,
      lavori_attivi: 12,
      fatturato_mese: '11500.00',
      fatturato_mese_precedente: '9800.00',
      pagamenti_scaduti_totale: '4820.00',
      pagamenti_scaduti_clienti_count: 3,
      materiali_esaurimento_count: 2,
      in_prova_count: 2,
      tecnico_saturo_id: null,
      tecnico_saturo_count: 0,
      aggiornato_at: new Date().toISOString(),
    }
    const result = mapTitolareKpiRow(row)
    expect(result.fatturato_mese).toBe(11500)
    expect(result.fatturato_mese_precedente).toBe(9800)
    expect(result.pagamenti_scaduti_totale).toBe(4820)
    expect(result.materiali_esaurimento_count).toBe(2)
    expect(result.consegne_oggi).toBe(5)
  })
})

describe('mapTecnicoLavoriRows', () => {
  it('restituisce array vuoto su input null', () => {
    expect(mapTecnicoLavoriRows(null)).toEqual([])
  })

  it('ordina urgenti prima degli altri', () => {
    const rows = [
      {
        id: '1', numero_lavoro: '0041', stato: 'in_lavorazione' as const,
        priorita: 'normale' as const, tipo_dispositivo: 'protesi_fissa' as const,
        descrizione: 'Corona', data_consegna_prevista: '2026-05-20',
        ora_consegna: null, paziente_nome_snapshot: null,
        clienti: { nome: 'Mario', cognome: 'Rossi', studio_nome: 'Studio Rossi' },
      },
      {
        id: '2', numero_lavoro: '0028', stato: 'in_ritardo' as const,
        priorita: 'urgente' as const, tipo_dispositivo: 'scheletrato' as const,
        descrizione: 'Scheletrato', data_consegna_prevista: '2026-05-14',
        ora_consegna: null, paziente_nome_snapshot: null,
        clienti: { nome: 'Luca', cognome: 'Bianchi', studio_nome: null },
      },
    ]
    const result = mapTecnicoLavoriRows(rows)
    expect(result[0].id).toBe('2')  // in_ritardo prima
    expect(result[1].id).toBe('1')
  })
})

describe('mapFrontDeskConsegneRows', () => {
  it('restituisce array vuoto su input null', () => {
    expect(mapFrontDeskConsegneRows(null)).toEqual([])
  })

  it('formatta ora_consegna correttamente', () => {
    const rows = [
      {
        id: '1', numero_lavoro: '0041', stato: 'pronto' as const,
        priorita: 'normale' as const, tipo_dispositivo: 'protesi_fissa' as const,
        descrizione: 'Corona', data_consegna_prevista: '2026-05-15',
        ora_consegna: '09:30', paziente_nome_snapshot: 'Luigi Verdi',
        clienti: { nome: 'Carlo', cognome: 'Rossi', studio_nome: 'Studio Rossi', telefono: null },
      },
    ]
    const result = mapFrontDeskConsegneRows(rows)
    expect(result[0].ora_consegna).toBe('09:30')
    expect(result[0].cliente_display).toBe('Studio Rossi')
  })
})

describe('isCacheStale', () => {
  it('ritorna true se aggiornato_at è null', () => {
    expect(isCacheStale(null)).toBe(true)
  })

  it('ritorna true se cache > 15 minuti fa', () => {
    const oldDate = new Date(Date.now() - 16 * 60 * 1000).toISOString()
    expect(isCacheStale(oldDate)).toBe(true)
  })

  it('ritorna false se cache < 15 minuti fa', () => {
    const recentDate = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    expect(isCacheStale(recentDate)).toBe(false)
  })
})
```

Esegui — DEVE fallire (file non esistono ancora):
```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app"
npm run test:unit -- tests/unit/dashboard-kpi.test.ts 2>&1 | tail -5
# Expected output: FAIL tests/unit/dashboard-kpi.test.ts — Cannot find module '@/lib/dashboard/queries'
```

- [ ] **1.2 Crea la migration SQL**

```sql
-- supabase/migrations/006_dashboard_extended_kpi.sql
-- UÀ Plan C — Extended dashboard KPI + pg_cron
-- 2026-05-15

-- ============================================================
-- 1. ESTENDE dashboard_kpi_cache con colonne mancanti
-- ============================================================
ALTER TABLE dashboard_kpi_cache
  ADD COLUMN IF NOT EXISTS fatturato_mese_precedente   NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pagamenti_scaduti_totale     NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pagamenti_scaduti_clienti_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS materiali_esaurimento_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS in_prova_count              INTEGER NOT NULL DEFAULT 0;

-- ============================================================
-- 2. RISCRIVE refresh_dashboard_cache() — ora calcola tutti i KPI
-- ============================================================
CREATE OR REPLACE FUNCTION refresh_dashboard_cache(p_lab_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mese_corrente      DATE := date_trunc('month', CURRENT_DATE)::DATE;
  v_mese_precedente    DATE := (date_trunc('month', CURRENT_DATE) - INTERVAL '1 month')::DATE;
  v_mese_prec_fine     DATE := (date_trunc('month', CURRENT_DATE) - INTERVAL '1 day')::DATE;
  v_pagamenti_scad_tot NUMERIC(12,2) := 0;
  v_pagamenti_scad_ct  INTEGER := 0;
BEGIN
  -- Calcola pagamenti scaduti (lavori con saldo a debito da >30gg)
  -- Logica: se la data_consegna_prevista < (CURRENT_DATE - 30)
  -- e il totale pagato < prezzo_unitario del lavoro, il residuo è scaduto.
  -- Usiamo una CTE per semplicità e chiarezza.
  SELECT
    COALESCE(SUM(residuo), 0),
    COUNT(*)
  INTO v_pagamenti_scad_tot, v_pagamenti_scad_ct
  FROM (
    SELECT
      l.id,
      COALESCE(l.prezzo_unitario, 0)
        - COALESCE((
            SELECT SUM(p.importo)
            FROM lavori_partitario p
            WHERE p.lavoro_id = l.id AND p.deleted_at IS NULL
          ), 0) AS residuo
    FROM lavori l
    WHERE l.laboratorio_id = p_lab_id
      AND l.deleted_at IS NULL
      AND l.stato NOT IN ('annullato')
      AND l.data_consegna_prevista < CURRENT_DATE - INTERVAL '30 days'
      AND COALESCE(l.prezzo_unitario, 0) > 0
  ) sub
  WHERE residuo > 0;

  INSERT INTO dashboard_kpi_cache (
    laboratorio_id,
    consegne_oggi,
    lavori_in_ritardo,
    pronti_non_fatturati,
    mdr_incompleti,
    spedizioni_in_ritardo,
    is_rifacimento_count,
    stl_non_assegnati,
    lavori_attivi,
    fatturato_mese,
    fatturato_mese_precedente,
    pagamenti_scaduti_totale,
    pagamenti_scaduti_clienti_count,
    materiali_esaurimento_count,
    in_prova_count,
    aggiornato_at
  )
  SELECT
    p_lab_id,
    -- KPI 1: consegne oggi (pronte o in lavorazione, scadenza oggi)
    COUNT(*) FILTER (
      WHERE stato NOT IN ('consegnato','annullato')
        AND data_consegna_prevista = CURRENT_DATE
    ),
    -- KPI 2: in ritardo
    COUNT(*) FILTER (WHERE stato = 'in_ritardo'),
    -- KPI 3: pronti non fatturati
    COUNT(*) FILTER (
      WHERE stato = 'pronto' AND incluso_in_fattura = FALSE
    ),
    -- KPI 4: MDR incompleti (consegnati senza DdC)
    COUNT(*) FILTER (
      WHERE stato = 'consegnato' AND conformato = FALSE
    ),
    -- KPI 5: spedizioni in ritardo (spedito, data prevista > 2gg fa)
    COUNT(*) FILTER (
      WHERE spedizione_stato = 'spedito'
        AND data_consegna_prevista < CURRENT_DATE - INTERVAL '2 days'
    ),
    -- KPI 6: rifacimenti mese corrente
    COUNT(*) FILTER (
      WHERE is_rifacimento = TRUE
        AND data_ingresso >= v_mese_corrente
    ),
    -- KPI 7: STL non assegnati
    COUNT(*) FILTER (
      WHERE impronta_digitale = TRUE
        AND tecnico_id IS NULL
        AND stato = 'ricevuto'
    ),
    -- KPI 8: lavori attivi
    COUNT(*) FILTER (
      WHERE stato NOT IN ('consegnato','annullato','ricevuto')
    ),
    -- Fatturato mese corrente
    COALESCE((
      SELECT SUM(f.totale)
      FROM fatture f
      WHERE f.laboratorio_id = p_lab_id
        AND f.deleted_at IS NULL
        AND f.data >= v_mese_corrente
        AND f.stato_sdi NOT IN ('draft','scartata','errore')
    ), 0),
    -- Fatturato mese precedente
    COALESCE((
      SELECT SUM(f.totale)
      FROM fatture f
      WHERE f.laboratorio_id = p_lab_id
        AND f.deleted_at IS NULL
        AND f.data >= v_mese_precedente
        AND f.data <= v_mese_prec_fine
        AND f.stato_sdi NOT IN ('draft','scartata','errore')
    ), 0),
    -- Pagamenti scaduti (calcolati sopra)
    v_pagamenti_scad_tot,
    v_pagamenti_scad_ct,
    -- Materiali in esaurimento (scorta_attuale <= scorta_minima)
    (
      SELECT COUNT(*)
      FROM magazzino m
      WHERE m.laboratorio_id = p_lab_id
        AND m.deleted_at IS NULL
        AND m.attivo = TRUE
        AND m.scorta_attuale <= m.scorta_minima
        AND m.scorta_minima > 0
    ),
    -- Lavori in prova esterna
    COUNT(*) FILTER (WHERE stato = 'in_prova'),
    NOW()
  FROM lavori
  WHERE laboratorio_id = p_lab_id AND deleted_at IS NULL
  ON CONFLICT (laboratorio_id) DO UPDATE SET
    consegne_oggi                    = EXCLUDED.consegne_oggi,
    lavori_in_ritardo                = EXCLUDED.lavori_in_ritardo,
    pronti_non_fatturati             = EXCLUDED.pronti_non_fatturati,
    mdr_incompleti                   = EXCLUDED.mdr_incompleti,
    spedizioni_in_ritardo            = EXCLUDED.spedizioni_in_ritardo,
    is_rifacimento_count             = EXCLUDED.is_rifacimento_count,
    stl_non_assegnati                = EXCLUDED.stl_non_assegnati,
    lavori_attivi                    = EXCLUDED.lavori_attivi,
    fatturato_mese                   = EXCLUDED.fatturato_mese,
    fatturato_mese_precedente        = EXCLUDED.fatturato_mese_precedente,
    pagamenti_scaduti_totale         = EXCLUDED.pagamenti_scaduti_totale,
    pagamenti_scaduti_clienti_count  = EXCLUDED.pagamenti_scaduti_clienti_count,
    materiali_esaurimento_count      = EXCLUDED.materiali_esaurimento_count,
    in_prova_count                   = EXCLUDED.in_prova_count,
    aggiornato_at                    = NOW();
END;
$$;

-- ============================================================
-- 3. pg_cron — aggiornamento automatico ogni 15 minuti
-- ============================================================
-- NOTA OPERATIVA: pg_cron richiede l'estensione abilitata nel
-- Supabase Dashboard → Settings → Database → Extensions → pg_cron.
-- Il cron job scorre tutti i lab attivi (stato IN ('attivo','trial')).
-- Questo SQL va eseguito DOPO aver abilitato l'estensione.

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Rimuovi job precedente se esiste (idempotente)
DO $unsched$
BEGIN
  PERFORM cron.unschedule('refresh-dashboard-kpi');
EXCEPTION WHEN OTHERS THEN NULL;
END
$unsched$;

SELECT cron.schedule(
  'refresh-dashboard-kpi',
  '*/15 * * * *',
  $job$
  DO $body$
  DECLARE r RECORD;
  BEGIN
    FOR r IN
      SELECT id FROM laboratori
      WHERE deleted_at IS NULL
        AND stato IN ('attivo','trial')
    LOOP
      PERFORM refresh_dashboard_cache(r.id);
    END LOOP;
  END
  $body$;
  $job$
);

-- ============================================================
-- 4. RLS: aggiorna policy per includere nuove colonne
--    (le policy esistenti usano USING su laboratorio_id —
--     non serve aggiornare, le nuove colonne sono incluse
--     automaticamente dal SELECT *)
-- ============================================================

COMMENT ON COLUMN dashboard_kpi_cache.fatturato_mese_precedente IS
  'Fatturato del mese solare precedente a quello corrente';
COMMENT ON COLUMN dashboard_kpi_cache.pagamenti_scaduti_totale IS
  'Somma residuo non pagato su lavori con data_consegna_prevista > 30gg fa';
COMMENT ON COLUMN dashboard_kpi_cache.pagamenti_scaduti_clienti_count IS
  'Numero di clienti distinti con almeno un lavoro scaduto non pagato';
COMMENT ON COLUMN dashboard_kpi_cache.materiali_esaurimento_count IS
  'Articoli magazzino con scorta_attuale <= scorta_minima (e scorta_minima > 0)';
COMMENT ON COLUMN dashboard_kpi_cache.in_prova_count IS
  'Lavori con stato = ''in_prova'' — attesa rientro dal dentista';
```

- [ ] **1.3 Applica la migration**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app"
npx supabase db push
# Expected output: Applying migration 006_dashboard_extended_kpi.sql... done
```

**Commit Task 1:**
```bash
git add supabase/migrations/006_dashboard_extended_kpi.sql
git commit -m "feat(db): extend dashboard_kpi_cache with fatturato precedente, pagamenti scaduti, materiali esaurimento + pg_cron ogni 15min"
```

---

## Task 2: Tipi TypeScript + Funzioni Pure Testabili

**Files:**
- Modify: `src/types/domain.ts`
- Create: `src/lib/dashboard/queries.ts`
- Create: `src/lib/dashboard/cache-stale.ts`

**Prerequisito approvazione mockup:** Task 0 completato e approvato da Francesco.

- [ ] **2.1 Estendi `src/types/domain.ts` — nuovi tipi**

Aggiungi subito dopo il tipo `DashboardStats` esistente (riga ~715):

```typescript
// ============================================================
// DASHBOARD EXTENDED — nuovi KPI (Plan C — migration 005)
// ============================================================
export interface DashboardStatsExtended extends DashboardStats {
  fatturato_mese_precedente: number;
  pagamenti_scaduti_totale: number;
  pagamenti_scaduti_clienti_count: number;
  materiali_esaurimento_count: number;
  in_prova_count: number;
}

// ─── Vista TECNICO ───────────────────────────────────────────
export interface TecnicoDashboardItem {
  id: string;
  numero_lavoro: string;
  stato: StatoLavoro;
  priorita: PrioritaLavoro;
  tipo_dispositivo: TipoDispositivo;
  descrizione: string;
  data_consegna_prevista: string;
  ora_consegna: string | null;
  paziente_nome_snapshot: string | null;
  cliente_display: string;          // studio_nome ?? "Nome Cognome"
  prossima_fase: string | null;     // prima fase non eseguita
  completamento_perc: number;       // 0-100, basato su fasi completate/totali
  is_urgente: boolean;              // priorita IN ('urgente','extra_urgente') OR stato='in_ritardo'
}

export interface TecnicoDashboard {
  lavori_urgenti: TecnicoDashboardItem[];      // stato=in_ritardo OR priorita urgente/extra_urgente
  lavori_oggi: TecnicoDashboardItem[];         // data_consegna_prevista = today (non urgenti)
  in_prova_rientro_oggi: TecnicoDashboardItem[]; // stato=in_prova, data_prima_prova=today
}

// ─── Vista FRONT DESK ────────────────────────────────────────
export interface FrontDeskConsegnaItem {
  id: string;
  numero_lavoro: string;
  stato: StatoLavoro;
  tipo_dispositivo: TipoDispositivo;
  descrizione: string;
  data_consegna_prevista: string;
  ora_consegna: string | null;
  paziente_nome_snapshot: string | null;
  cliente_display: string;
  cliente_telefono: string | null;
}

export interface FrontDeskPagamentoScaduto {
  cliente_id: string;
  cliente_display: string;
  cliente_telefono: string | null;
  residuo_totale: number;
  giorni_scaduto: number;         // giorni dalla data_consegna_prevista più vecchia
  lavori_count: number;
}

export interface FrontDeskDashboard {
  consegne_oggi: FrontDeskConsegnaItem[];
  ritiri_attesi_oggi: FrontDeskConsegnaItem[];    // lavori con data_ingresso = today
  in_prova_rientro_oggi: FrontDeskConsegnaItem[]; // stato=in_prova, data_prima_prova=today
  da_contattare: FrontDeskPagamentoScaduto[];     // insoluti >30gg, top 5
}
```

- [ ] **2.2 Crea `src/lib/dashboard/queries.ts`**

```typescript
// src/lib/dashboard/queries.ts
// Funzioni pure per il calcolo e mapping dei dati dashboard.
// Tutte accettano un SupabaseClient + parametri — zero side effects extra.
// Testabili in isolamento (unit test mock il client).

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  DashboardStatsExtended,
  TecnicoDashboard,
  TecnicoDashboardItem,
  FrontDeskDashboard,
  FrontDeskConsegnaItem,
  FrontDeskPagamentoScaduto,
  StatoLavoro,
  PrioritaLavoro,
  TipoDispositivo,
} from '@/types/domain'

// ─── Helpers ─────────────────────────────────────────────────

function clienteDisplay(c: {
  nome: string
  cognome: string
  studio_nome: string | null
} | null): string {
  if (!c) return '—'
  return c.studio_nome ?? `${c.nome} ${c.cognome}`
}

function oggiISO(): string {
  return new Date().toISOString().split('T')[0]
}

// ─── MAPPER PURI (usati nei test unitari) ────────────────────

export type RawKpiCacheRow = {
  laboratorio_id: string
  consegne_oggi: number
  lavori_in_ritardo: number
  pronti_non_fatturati: number
  mdr_incompleti: number
  spedizioni_in_ritardo: number
  is_rifacimento_count: number
  stl_non_assegnati: number
  lavori_attivi: number
  fatturato_mese: string | number
  fatturato_mese_precedente?: string | number
  pagamenti_scaduti_totale?: string | number
  pagamenti_scaduti_clienti_count?: number
  materiali_esaurimento_count?: number
  in_prova_count?: number
  tecnico_saturo_id: string | null
  tecnico_saturo_count: number
  aggiornato_at: string
} | null

export function mapTitolareKpiRow(row: RawKpiCacheRow): DashboardStatsExtended {
  const defaults: DashboardStatsExtended = {
    consegne_oggi: 0,
    lavori_in_ritardo: 0,
    pronti_non_fatturati: 0,
    tecnico_piu_saturo: null,
    mdr_incompleti: 0,
    spedizioni_in_ritardo: 0,
    is_rifacimento_count: 0,
    stl_non_assegnati: 0,
    lavori_attivi: 0,
    fatturato_mese: 0,
    fatturato_mese_precedente: 0,
    pagamenti_scaduti_totale: 0,
    pagamenti_scaduti_clienti_count: 0,
    materiali_esaurimento_count: 0,
    in_prova_count: 0,
  }
  if (!row) return defaults
  return {
    ...defaults,
    consegne_oggi: row.consegne_oggi ?? 0,
    lavori_in_ritardo: row.lavori_in_ritardo ?? 0,
    pronti_non_fatturati: row.pronti_non_fatturati ?? 0,
    mdr_incompleti: row.mdr_incompleti ?? 0,
    spedizioni_in_ritardo: row.spedizioni_in_ritardo ?? 0,
    is_rifacimento_count: row.is_rifacimento_count ?? 0,
    stl_non_assegnati: row.stl_non_assegnati ?? 0,
    lavori_attivi: row.lavori_attivi ?? 0,
    fatturato_mese: Number(row.fatturato_mese ?? 0),
    fatturato_mese_precedente: Number(row.fatturato_mese_precedente ?? 0),
    pagamenti_scaduti_totale: Number(row.pagamenti_scaduti_totale ?? 0),
    pagamenti_scaduti_clienti_count: row.pagamenti_scaduti_clienti_count ?? 0,
    materiali_esaurimento_count: row.materiali_esaurimento_count ?? 0,
    in_prova_count: row.in_prova_count ?? 0,
    tecnico_piu_saturo: row.tecnico_saturo_id
      ? { nome: '', sigla: null, lavori_attivi: row.tecnico_saturo_count ?? 0 }
      : null,
  }
}

type RawLavoroRow = {
  id: string
  numero_lavoro: string
  stato: StatoLavoro
  priorita: PrioritaLavoro
  tipo_dispositivo: TipoDispositivo
  descrizione: string
  data_consegna_prevista: string
  ora_consegna: string | null
  paziente_nome_snapshot: string | null
  clienti: { nome: string; cognome: string; studio_nome: string | null } | null
}

export function mapTecnicoLavoriRows(
  rows: RawLavoroRow[] | null
): TecnicoDashboardItem[] {
  if (!rows) return []
  return rows
    .map((r) => ({
      id: r.id,
      numero_lavoro: r.numero_lavoro,
      stato: r.stato,
      priorita: r.priorita,
      tipo_dispositivo: r.tipo_dispositivo,
      descrizione: r.descrizione,
      data_consegna_prevista: r.data_consegna_prevista,
      ora_consegna: r.ora_consegna,
      paziente_nome_snapshot: r.paziente_nome_snapshot,
      cliente_display: clienteDisplay(r.clienti),
      prossima_fase: null,       // popolato da query separata se necessario
      completamento_perc: 0,     // popolato da query separata se necessario
      is_urgente:
        r.stato === 'in_ritardo' ||
        r.priorita === 'urgente' ||
        r.priorita === 'extra_urgente',
    }))
    .sort((a, b) => {
      if (a.is_urgente && !b.is_urgente) return -1
      if (!a.is_urgente && b.is_urgente) return 1
      return a.data_consegna_prevista.localeCompare(b.data_consegna_prevista)
    })
}

type RawFrontDeskRow = RawLavoroRow & {
  clienti: {
    nome: string
    cognome: string
    studio_nome: string | null
    telefono: string | null
  } | null
}

export function mapFrontDeskConsegneRows(
  rows: RawFrontDeskRow[] | null
): FrontDeskConsegnaItem[] {
  if (!rows) return []
  return rows.map((r) => ({
    id: r.id,
    numero_lavoro: r.numero_lavoro,
    stato: r.stato,
    tipo_dispositivo: r.tipo_dispositivo,
    descrizione: r.descrizione,
    data_consegna_prevista: r.data_consegna_prevista,
    ora_consegna: r.ora_consegna,
    paziente_nome_snapshot: r.paziente_nome_snapshot,
    cliente_display: clienteDisplay(r.clienti),
    cliente_telefono: r.clienti?.telefono ?? null,
  }))
}

// ─── QUERY ASYNC (usate dalle route API e dalla dashboard page) ───

/**
 * Legge il cache KPI titolare.
 * Se la cache è stale (>15 min), invoca refresh_dashboard_cache via RPC
 * e rilegge. Usa getServiceClient per poter chiamare la funzione SECURITY DEFINER.
 */
export async function getTitolareKpi(
  svc: SupabaseClient,
  labId: string,
  stale: boolean
): Promise<DashboardStatsExtended> {
  if (stale) {
    await svc.rpc('refresh_dashboard_cache', { p_lab_id: labId })
  }
  const { data } = await svc
    .from('dashboard_kpi_cache')
    .select('*')
    .eq('laboratorio_id', labId)
    .maybeSingle()
  return mapTitolareKpiRow(data as RawKpiCacheRow)
}

/**
 * Top 3 clienti per pagamenti scaduti — usata dalla DashboardTitolare.
 * Query diretta su lavori + lavori_partitario per non gonfiare la cache.
 */
export async function getPagamentiScadutiTop(
  svc: SupabaseClient,
  labId: string,
  limit = 3
): Promise<Array<{
  cliente_id: string
  cliente_display: string
  residuo: number
}>> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 30)
  const cutoffISO = cutoff.toISOString().split('T')[0]

  const { data } = await svc
    .from('lavori')
    .select(`
      id,
      prezzo_unitario,
      clienti!inner(id, nome, cognome, studio_nome),
      lavori_partitario(importo)
    `)
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .not('stato', 'in', '("annullato")')
    .lt('data_consegna_prevista', cutoffISO)
    .gt('prezzo_unitario', 0)

  if (!data) return []

  // Aggrega per cliente
  const map = new Map<string, {
    cliente_id: string
    cliente_display: string
    residuo: number
  }>()

  for (const l of data as Array<{
    id: string
    prezzo_unitario: number | null
    clienti: { id: string; nome: string; cognome: string; studio_nome: string | null }
    lavori_partitario: Array<{ importo: number }>
  }>) {
    const pagato = (l.lavori_partitario ?? []).reduce((s, p) => s + Number(p.importo), 0)
    const residuo = Number(l.prezzo_unitario ?? 0) - pagato
    if (residuo <= 0) continue

    const cid = l.clienti.id
    const existing = map.get(cid)
    const display = clienteDisplay(l.clienti)
    map.set(cid, {
      cliente_id: cid,
      cliente_display: display,
      residuo: (existing?.residuo ?? 0) + residuo,
    })
  }

  return [...map.values()]
    .sort((a, b) => b.residuo - a.residuo)
    .slice(0, limit)
}

/**
 * Materiali in esaurimento — query diretta su magazzino.
 * Separata dalla cache per avere i nomi degli articoli.
 */
export async function getMaterialiEsaurimento(
  svc: SupabaseClient,
  labId: string,
  limit = 5
): Promise<Array<{
  id: string
  nome: string
  scorta_attuale: number
  scorta_minima: number
  um_acquisto: string
}>> {
  // Supabase non supporta column-to-column comparison (scorta_attuale <= scorta_minima).
  // Recuperiamo un sovrainsieme (scorta_minima > 0, ordinati per scorta_attuale asc)
  // e filtriamo in JS. Con <100 articoli per lab V1 questo è accettabile.
  const { data } = await svc
    .from('magazzino')
    .select('id, nome, scorta_attuale, scorta_minima, um_acquisto')
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .eq('attivo', true)
    .gt('scorta_minima', 0)
    .order('scorta_attuale', { ascending: true })
    .limit(limit * 5)   // margine per il filtro JS successivo

  return (data ?? [])
    .filter(
      (m: { scorta_attuale: number; scorta_minima: number }) =>
        m.scorta_attuale <= m.scorta_minima
    )
    .slice(0, limit)
}

/**
 * Lavori in prova con data rientro oggi o passata — per TITOLARE.
 */
export async function getLavoriInProvaRientro(
  svc: SupabaseClient,
  labId: string
): Promise<Array<{
  id: string
  numero_lavoro: string
  descrizione: string
  data_prima_prova: string | null
  clienti: { nome: string; cognome: string; studio_nome: string | null } | null
}>> {
  const oggi = oggiISO()
  const { data } = await svc
    .from('lavori')
    .select('id, numero_lavoro, descrizione, data_prima_prova, clienti(nome, cognome, studio_nome)')
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .eq('stato', 'in_prova')
    .lte('data_prima_prova', oggi)
    .order('data_prima_prova', { ascending: true })
    .limit(10)
  return (data ?? []) as Array<{
    id: string
    numero_lavoro: string
    descrizione: string
    data_prima_prova: string | null
    clienti: { nome: string; cognome: string; studio_nome: string | null } | null
  }>
}

/**
 * Dashboard dati tecnico — query filtrate per utente_id del tecnico.
 */
export async function getTecnicoDashboard(
  svc: SupabaseClient,
  labId: string,
  tecnicoId: string
): Promise<TecnicoDashboard> {
  const oggi = oggiISO()

  // Urgenti e in ritardo
  const { data: urgentiData } = await svc
    .from('lavori')
    .select('id, numero_lavoro, stato, priorita, tipo_dispositivo, descrizione, data_consegna_prevista, ora_consegna, paziente_nome_snapshot, clienti(nome, cognome, studio_nome)')
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .eq('tecnico_id', tecnicoId)
    .or('stato.eq.in_ritardo,priorita.eq.urgente,priorita.eq.extra_urgente')
    .not('stato', 'in', '("consegnato","annullato")')
    .order('data_consegna_prevista', { ascending: true })
    .limit(20)

  // Lavori di oggi (esclusi urgenti già in lista)
  const { data: oggiData } = await svc
    .from('lavori')
    .select('id, numero_lavoro, stato, priorita, tipo_dispositivo, descrizione, data_consegna_prevista, ora_consegna, paziente_nome_snapshot, clienti(nome, cognome, studio_nome)')
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .eq('tecnico_id', tecnicoId)
    .eq('data_consegna_prevista', oggi)
    .not('stato', 'in', '("consegnato","annullato","in_ritardo")')
    .neq('priorita', 'urgente')
    .neq('priorita', 'extra_urgente')
    .order('ora_consegna', { ascending: true, nullsFirst: false })
    .limit(20)

  // In prova che rientrano oggi
  const { data: provaData } = await svc
    .from('lavori')
    .select('id, numero_lavoro, stato, priorita, tipo_dispositivo, descrizione, data_consegna_prevista, ora_consegna, paziente_nome_snapshot, clienti(nome, cognome, studio_nome)')
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .eq('tecnico_id', tecnicoId)
    .eq('stato', 'in_prova')
    .lte('data_prima_prova', oggi)
    .order('data_prima_prova', { ascending: true })
    .limit(10)

  return {
    lavori_urgenti: mapTecnicoLavoriRows(urgentiData as RawLavoroRow[] | null),
    lavori_oggi: mapTecnicoLavoriRows(oggiData as RawLavoroRow[] | null),
    in_prova_rientro_oggi: mapTecnicoLavoriRows(provaData as RawLavoroRow[] | null),
  }
}

/**
 * Dashboard dati front desk.
 */
export async function getFrontDeskDashboard(
  svc: SupabaseClient,
  labId: string
): Promise<FrontDeskDashboard> {
  const oggi = oggiISO()
  const cutoff30 = new Date()
  cutoff30.setDate(cutoff30.getDate() - 30)
  const cutoff30ISO = cutoff30.toISOString().split('T')[0]

  const selectCampi = 'id, numero_lavoro, stato, priorita, tipo_dispositivo, descrizione, data_consegna_prevista, ora_consegna, paziente_nome_snapshot, clienti(nome, cognome, studio_nome, telefono)'

  // Consegne di oggi
  const { data: consegneData } = await svc
    .from('lavori')
    .select(selectCampi)
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .eq('data_consegna_prevista', oggi)
    .not('stato', 'in', '("consegnato","annullato")')
    .order('ora_consegna', { ascending: true, nullsFirst: false })
    .limit(30)

  // Ritiri attesi oggi (lavori ricevuti oggi — data_ingresso = oggi)
  const { data: rititiData } = await svc
    .from('lavori')
    .select(selectCampi)
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .eq('data_ingresso', oggi)
    .order('created_at', { ascending: true })
    .limit(20)

  // In prova rientrano oggi
  const { data: provaData } = await svc
    .from('lavori')
    .select(selectCampi)
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .eq('stato', 'in_prova')
    .lte('data_prima_prova', oggi)
    .order('data_prima_prova', { ascending: true })
    .limit(10)

  // Da contattare: insoluti > 30gg, top 5 clienti per importo
  const { data: insolutoData } = await svc
    .from('lavori')
    .select(`
      id,
      prezzo_unitario,
      data_consegna_prevista,
      clienti!inner(id, nome, cognome, studio_nome, telefono),
      lavori_partitario(importo)
    `)
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .not('stato', 'in', '("annullato")')
    .lt('data_consegna_prevista', cutoff30ISO)
    .gt('prezzo_unitario', 0)

  const pagMap = new Map<string, FrontDeskPagamentoScaduto>()
  for (const l of (insolutoData ?? []) as Array<{
    id: string
    prezzo_unitario: number | null
    data_consegna_prevista: string
    clienti: { id: string; nome: string; cognome: string; studio_nome: string | null; telefono: string | null }
    lavori_partitario: Array<{ importo: number }>
  }>) {
    const pagato = (l.lavori_partitario ?? []).reduce((s, p) => s + Number(p.importo), 0)
    const residuo = Number(l.prezzo_unitario ?? 0) - pagato
    if (residuo <= 0) continue
    const cid = l.clienti.id
    const giorni = Math.floor(
      (Date.now() - new Date(l.data_consegna_prevista).getTime()) / 86400000
    )
    const existing = pagMap.get(cid)
    pagMap.set(cid, {
      cliente_id: cid,
      cliente_display: clienteDisplay(l.clienti),
      cliente_telefono: l.clienti.telefono,
      residuo_totale: (existing?.residuo_totale ?? 0) + residuo,
      giorni_scaduto: Math.max(existing?.giorni_scaduto ?? 0, giorni),
      lavori_count: (existing?.lavori_count ?? 0) + 1,
    })
  }

  const daContattare = [...pagMap.values()]
    .sort((a, b) => b.residuo_totale - a.residuo_totale)
    .slice(0, 5)

  return {
    consegne_oggi: mapFrontDeskConsegneRows(consegneData as RawFrontDeskRow[] | null),
    ritiri_attesi_oggi: mapFrontDeskConsegneRows(rititiData as RawFrontDeskRow[] | null),
    in_prova_rientro_oggi: mapFrontDeskConsegneRows(provaData as RawFrontDeskRow[] | null),
    da_contattare: daContattare,
  }
}
```

- [ ] **2.3 Crea `src/lib/dashboard/cache-stale.ts`**

```typescript
// src/lib/dashboard/cache-stale.ts
// Logica di staleness della cache KPI.
// CACHE_TTL_MS = 15 minuti — allineato al cron pg_cron ogni 15 min.

export const CACHE_TTL_MS = 15 * 60 * 1000

/**
 * Restituisce true se la cache deve essere rinfrescata.
 * @param aggiornato_at — valore ISO string da dashboard_kpi_cache, o null
 */
export function isCacheStale(aggiornato_at: string | null): boolean {
  if (!aggiornato_at) return true
  const age = Date.now() - new Date(aggiornato_at).getTime()
  return age > CACHE_TTL_MS
}
```

- [ ] **2.4 Esegui i test unitari — devono passare**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app"
npm run test:unit -- tests/unit/dashboard-kpi.test.ts 2>&1 | tail -15
# Expected output:
# PASS tests/unit/dashboard-kpi.test.ts
# Test Files  1 passed (1)
# Tests  9 passed (9)
```

**Commit Task 2:**
```bash
git add src/types/domain.ts src/lib/dashboard/queries.ts src/lib/dashboard/cache-stale.ts tests/unit/dashboard-kpi.test.ts
git commit -m "feat(dashboard): add extended KPI types, pure query mappers, and cache staleness logic with unit tests"
```

---

## Task 3: API Route — RBAC-Aware KPI Endpoint

**Files:**
- Modify: `src/app/api/dashboard/kpi/route.ts`

- [ ] **3.1 Aggiorna la route**

```typescript
// src/app/api/dashboard/kpi/route.ts
import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getTitolareKpi, getTecnicoDashboard, getFrontDeskDashboard } from '@/lib/dashboard/queries'
import { isCacheStale } from '@/lib/dashboard/cache-stale'
import type { DashboardStatsExtended, TecnicoDashboard, FrontDeskDashboard } from '@/types/domain'

// La route risponde con uno shape union — il client distingue per ruolo.
type DashboardApiResponse =
  | { role: 'titolare'; data: DashboardStatsExtended }
  | { role: 'tecnico'; data: TecnicoDashboard }
  | { role: 'front_desk'; data: FrontDeskDashboard }
  | { error: string }

export async function GET(): Promise<NextResponse<DashboardApiResponse>> {
  const userClient = await getServerUserClient()
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const svc = getServiceClient()

  // Carica utente con ruolo e laboratorio_id
  const { data: utente, error: utenteError } = await svc
    .from('utenti')
    .select('ruolo, laboratorio_id, id')
    .eq('id', user.id)
    .is('deleted_at', null)
    .single()

  if (utenteError || !utente) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const { ruolo, laboratorio_id: labId } = utente

  // ─── TITOLARE / admin_rete — serve dalla cache (con on-demand refresh) ───
  if (ruolo === 'titolare' || ruolo === 'admin_rete') {
    // Controlla staleness prima di rispondere
    const { data: cacheRow } = await svc
      .from('dashboard_kpi_cache')
      .select('aggiornato_at')
      .eq('laboratorio_id', labId)
      .maybeSingle()

    const stale = isCacheStale(cacheRow?.aggiornato_at ?? null)
    const kpi = await getTitolareKpi(svc, labId, stale)
    return NextResponse.json({ role: 'titolare', data: kpi })
  }

  // ─── TECNICO — query dirette filtrate per tecnico_id ─────────────────────
  if (ruolo === 'tecnico') {
    // tecnico_id: cerca nella tabella tecnici l'entry collegata a questo utente
    const { data: tecnico } = await svc
      .from('tecnici')
      .select('id')
      .eq('laboratorio_id', labId)
      .eq('utente_id', user.id)
      .is('deleted_at', null)
      .maybeSingle()

    if (!tecnico) {
      // Tecnico non ancora collegato a un profilo — restituisce dashboard vuota
      const empty: TecnicoDashboard = {
        lavori_urgenti: [],
        lavori_oggi: [],
        in_prova_rientro_oggi: [],
      }
      return NextResponse.json({ role: 'tecnico', data: empty })
    }

    const data = await getTecnicoDashboard(svc, labId, tecnico.id)
    return NextResponse.json({ role: 'tecnico', data })
  }

  // ─── FRONT DESK ──────────────────────────────────────────────────────────
  if (ruolo === 'front_desk') {
    const data = await getFrontDeskDashboard(svc, labId)
    return NextResponse.json({ role: 'front_desk', data })
  }

  return NextResponse.json({ error: 'Unknown role' }, { status: 400 })
}
```

**Commit Task 3:**
```bash
git add src/app/api/dashboard/kpi/route.ts
git commit -m "feat(api): dashboard/kpi RBAC routing — titolare from cache, tecnico/front_desk direct queries"
```

---

## Task 4: Componenti UI Riutilizzabili

**Prerequisito:** Mockup approvati (Task 0). Nessun codice UI senza approvazione.

**Files:**
- Create: `src/components/features/dashboard/KpiCard.tsx`
- Create: `src/components/features/dashboard/LavoroUrgente.tsx`

- [ ] **4.1 Crea `KpiCard.tsx`**

Usata dalla vista Titolare per ogni KPI numerico con label e colore semantico.
Pattern: Haptimorphism raised, Playfair Display per il numero, DM Sans per label.
Motion da `motion.ts` — nessun valore inline.

```typescript
// src/components/features/dashboard/KpiCard.tsx
'use client'

import { motion } from 'motion/react'
import { t, useReducedMotion } from '@/design-system/motion'

interface KpiCardProps {
  value: number
  label: string
  color: string                // HEX semantico
  subLabel?: string            // Testo secondario opzionale (es. "€ 4.820 totale")
  onClick?: () => void
  animationDelay?: number
  'aria-label'?: string
}

export function KpiCard({
  value,
  label,
  color,
  subLabel,
  onClick,
  animationDelay = 0,
  'aria-label': ariaLabel,
}: KpiCardProps) {
  const reducedMotion = useReducedMotion()

  const baseStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    background: '#1B2D6B',
    borderRadius: '20px',
    padding: '16px 18px',
    flex: '1 1 0',
    minWidth: '140px',
    cursor: onClick ? 'pointer' : 'default',
    border: 'none',
    WebkitTapHighlightColor: 'transparent',
    textDecoration: 'none',
    boxShadow:
      '-3px -3px 7px hsl(220 80% 35% / 0.55), 5px 5px 14px hsl(230 100% 4% / 0.95)',
  }

  const inner = (
    <>
      <span
        style={{
          fontFamily: 'Playfair Display, Georgia, serif',
          fontSize: '32px',
          fontWeight: 700,
          lineHeight: 1,
          color,
        }}
        aria-hidden="true"
      >
        {value}
      </span>
      <span
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '12px',
          fontWeight: 600,
          color: '#8899CC',
          marginTop: '6px',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {label}
      </span>
      {subLabel && (
        <span
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '12px',
            color: '#8899CC',
            marginTop: '4px',
          }}
        >
          {subLabel}
        </span>
      )}
    </>
  )

  const element = onClick ? (
    <button
      type="button"
      onClick={onClick}
      style={baseStyle}
      aria-label={ariaLabel ?? `${label}: ${value}`}
    >
      {inner}
    </button>
  ) : (
    <div
      role="region"
      aria-label={ariaLabel ?? `${label}: ${value}`}
      style={baseStyle}
    >
      {inner}
    </div>
  )

  if (reducedMotion) return element

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...t('normal', 'enter'), delay: animationDelay }}
      style={{ flex: '1 1 0', minWidth: '140px' }}
    >
      {element}
    </motion.div>
  )
}
```

- [ ] **4.2 Crea `LavoroUrgente.tsx`**

Card-row riutilizzabile per tutte e 3 le viste: mostra lavoro con indicatore
di urgenza/stato, nome cliente, numero lavoro, ora consegna.

```typescript
// src/components/features/dashboard/LavoroUrgente.tsx
'use client'

import Link from 'next/link'
import type { StatoLavoro, PrioritaLavoro } from '@/types/domain'

interface LavoroUrgenteProps {
  id: string
  numero_lavoro: string
  stato: StatoLavoro
  priorita: PrioritaLavoro
  cliente_display: string
  descrizione: string
  data_consegna_prevista: string
  ora_consegna: string | null
  paziente_nome_snapshot: string | null
  is_urgente?: boolean
}

const STATO_COLORS: Record<StatoLavoro, string> = {
  ricevuto: '#8899CC',
  in_lavorazione: '#4C6EF5',
  in_prova: '#FD7E14',
  pronto: '#2ECC9A',
  consegnato: '#2ECC9A',
  annullato: '#FA5252',
  in_ritardo: '#FA5252',
}

const STATO_LABELS: Record<StatoLavoro, string> = {
  ricevuto: 'Ricevuto',
  in_lavorazione: 'In lavorazione',
  in_prova: 'In prova',
  pronto: 'Pronto',
  consegnato: 'Consegnato',
  annullato: 'Annullato',
  in_ritardo: 'In ritardo',
}

function formatData(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function LavoroUrgente({
  id,
  numero_lavoro,
  stato,
  priorita,
  cliente_display,
  descrizione,
  data_consegna_prevista,
  ora_consegna,
  paziente_nome_snapshot,
  is_urgente,
}: LavoroUrgenteProps) {
  const statoColor = STATO_COLORS[stato] ?? '#8899CC'
  const prioritaLabel =
    priorita === 'extra_urgente'
      ? 'Extra urgente'
      : priorita === 'urgente'
      ? 'Urgente'
      : null

  const urgencyLabel =
    stato === 'in_ritardo' ? 'In ritardo' : prioritaLabel

  return (
    <Link
      href={`/lavori/${id}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 16px',
        textDecoration: 'none',
        color: 'inherit',
        borderBottom: '1px solid rgba(136,153,204,0.12)',
      }}
    >
      {/* Indicatore stato */}
      <div
        aria-hidden="true"
        style={{
          width: '4px',
          alignSelf: 'stretch',
          minHeight: '44px',
          borderRadius: '2px',
          background: statoColor,
          flexShrink: 0,
        }}
      />

      {/* Contenuto */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            marginBottom: '3px',
          }}
        >
          <span
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '15px',
              fontWeight: 600,
              color: '#F0F4FF',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {cliente_display}
          </span>
          {urgencyLabel && is_urgente && (
            <span
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '10px',
                fontWeight: 700,
                color: statoColor,
                background: `${statoColor}1A`,
                borderRadius: '6px',
                padding: '2px 8px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                flexShrink: 0,
              }}
              aria-label={`Priorità: ${urgencyLabel}`}
            >
              {urgencyLabel}
            </span>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <span
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '12px',
              fontWeight: 600,
              color: '#8899CC',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            #{numero_lavoro}
            {paziente_nome_snapshot
              ? ` · ${paziente_nome_snapshot}`
              : ` · ${descrizione}`}
          </span>
          <time
            dateTime={data_consegna_prevista}
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '12px',
              fontWeight: 500,
              color: stato === 'in_ritardo' ? '#FA5252' : '#D4A843',
              flexShrink: 0,
            }}
          >
            {ora_consegna ? `ore ${ora_consegna}` : formatData(data_consegna_prevista)}
          </time>
        </div>
      </div>

      {/* Chevron */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        style={{ flexShrink: 0, color: '#8899CC' }}
      >
        <path
          d="M6 4l4 4-4 4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  )
}
```

**Commit Task 4:**
```bash
git add src/components/features/dashboard/KpiCard.tsx src/components/features/dashboard/LavoroUrgente.tsx
git commit -m "feat(dashboard): add KpiCard and LavoroUrgente reusable components — haptimorphic, motion-token compliant"
```

---

## Task 5: Vista DashboardTitolare

**File:**
- Create: `src/components/features/dashboard/DashboardTitolare.tsx`

- [ ] **5.1 Crea il componente**

```typescript
// src/components/features/dashboard/DashboardTitolare.tsx
'use client'

import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { t, useReducedMotion, staggerDelay } from '@/design-system/motion'
import { KpiCard } from './KpiCard'
import { LavoroUrgente } from './LavoroUrgente'
import type {
  DashboardStatsExtended,
  FrontDeskConsegnaItem,
} from '@/types/domain'

interface LavoroProvaRientro {
  id: string
  numero_lavoro: string
  descrizione: string
  data_prima_prova: string | null
  clienti: { nome: string; cognome: string; studio_nome: string | null } | null
}

interface MaterialeEsaurimento {
  id: string
  nome: string
  scorta_attuale: number
  scorta_minima: number
  um_acquisto: string
}

interface PagamentoTop {
  cliente_id: string
  cliente_display: string
  residuo: number
}

interface DashboardTitolareProps {
  stats: DashboardStatsExtended
  consegneOggi: FrontDeskConsegnaItem[]
  lavoriInRitardo: Array<{
    id: string
    numero_lavoro: string
    stato: 'in_ritardo'
    priorita: 'normale' | 'urgente' | 'extra_urgente'
    tipo_dispositivo: string
    descrizione: string
    data_consegna_prevista: string
    ora_consegna: string | null
    paziente_nome_snapshot: string | null
    cliente_display: string
  }>
  inProvaRientro: LavoroProvaRientro[]
  materialiEsaurimento: MaterialeEsaurimento[]
  pagamentiTop: PagamentoTop[]
  nomeUtente: string
  nomeLabName: string | undefined
}

function formatEuro(n: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n)
}

function deltaFatturato(corrente: number, precedente: number): {
  perc: number
  up: boolean
} {
  if (precedente === 0) return { perc: 0, up: true }
  const perc = Math.round(((corrente - precedente) / precedente) * 100)
  return { perc: Math.abs(perc), up: perc >= 0 }
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h >= 6 && h < 12) return 'Buongiorno'
  if (h >= 12 && h < 17) return 'Buon pomeriggio'
  return 'Buonasera'
}

const SECTION_LABEL_STYLE: React.CSSProperties = {
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '11px',
  fontWeight: 600,
  color: '#8899CC',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  margin: '0 0 8px',
}

const CARD_STYLE: React.CSSProperties = {
  background: '#1B2D6B',
  borderRadius: '20px',
  overflow: 'hidden',
  boxShadow:
    '-3px -3px 7px hsl(220 80% 35% / 0.55), 5px 5px 14px hsl(230 100% 4% / 0.95)',
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 style={SECTION_LABEL_STYLE}>{children}</h2>
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        background: '#1B2D6B',
        borderRadius: '20px',
        padding: '28px 20px',
        textAlign: 'center',
        boxShadow:
          '-2px -2px 5px hsl(220 80% 35% / 0.4), 3px 3px 8px hsl(230 100% 4% / 0.8)',
      }}
    >
      <p
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '14px',
          color: '#8899CC',
          margin: 0,
        }}
      >
        {message}
      </p>
    </div>
  )
}

export function DashboardTitolare({
  stats,
  consegneOggi,
  lavoriInRitardo,
  inProvaRientro,
  materialiEsaurimento,
  pagamentiTop,
  nomeUtente,
  nomeLabName,
}: DashboardTitolareProps) {
  const router = useRouter()
  const reducedMotion = useReducedMotion()
  const delta = deltaFatturato(stats.fatturato_mese, stats.fatturato_mese_precedente)

  const today = new Date().toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const sectionVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0 },
  }

  return (
    <div style={{ paddingBottom: '88px' }}>
      {/* Header — mostra saluto + data */}
      <header style={{ padding: '20px 20px 12px' }}>
        <h1
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '20px',
            fontWeight: 700,
            color: '#F0F4FF',
            margin: 0,
          }}
        >
          {getGreeting()}, {nomeUtente}
        </h1>
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '13px',
            color: '#8899CC',
            margin: '2px 0 0',
          }}
        >
          {nomeLabName ? `${nomeLabName} · ` : ''}{today}
        </p>
      </header>

      {/* KPI Strip orizzontale — 5 chip scrollabili */}
      <div
        role="list"
        aria-label="KPI operativi"
        style={{
          display: 'flex',
          gap: '8px',
          padding: '0 20px 16px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {[
          { value: stats.lavori_in_ritardo, label: 'In ritardo', color: '#FA5252', route: '/lavori?f=in_ritardo' },
          { value: stats.consegne_oggi, label: 'Oggi', color: '#4C6EF5', route: '/lavori?f=consegne_oggi' },
          { value: stats.in_prova_count, label: 'In prova', color: '#FD7E14', route: '/lavori?f=in_prova' },
          { value: stats.pronti_non_fatturati, label: 'Da fatt.', color: '#D4A843', route: '/lavori?f=pronti' },
          { value: stats.materiali_esaurimento_count, label: 'Materiali', color: '#FA5252', route: '/magazzino' },
        ].map((chip, i) => {
          const delay = reducedMotion ? 0 : staggerDelay(5) * i
          return (
            <motion.div
              key={chip.label}
              role="listitem"
              initial={reducedMotion ? {} : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...t('fast', 'enter'), delay }}
            >
              <button
                type="button"
                onClick={() => router.push(chip.route)}
                aria-label={`${chip.label}: ${chip.value}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#1B2D6B',
                  borderRadius: '16px',
                  padding: '12px 14px',
                  minWidth: '76px',
                  minHeight: '52px',   // touch target WCAG 52px (CLAUDE.md §5)
                  flexShrink: 0,
                  border: 'none',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                  boxShadow:
                    '-2px -2px 5px hsl(220 80% 35% / 0.4), 3px 3px 8px hsl(230 100% 4% / 0.8)',
                }}
              >
                <span
                  style={{
                    fontFamily: 'Playfair Display, Georgia, serif',
                    fontSize: '24px',
                    fontWeight: 700,
                    lineHeight: 1,
                    color: chip.color,
                  }}
                  aria-hidden="true"
                >
                  {chip.value}
                </span>
                <span
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '10px',
                    fontWeight: 500,
                    color: '#8899CC',
                    marginTop: '4px',
                    letterSpacing: '0.02em',
                  }}
                >
                  {chip.label}
                </span>
              </button>
            </motion.div>
          )
        })}
      </div>

      {/* Sezione: Da consegnare oggi */}
      <AnimatePresence>
        <motion.section
          key="consegne"
          variants={sectionVariants}
          initial={reducedMotion ? {} : 'hidden'}
          animate="visible"
          transition={{ ...t('normal', 'enter'), delay: reducedMotion ? 0 : 0.05 }}
          style={{ padding: '0 20px 16px' }}
        >
          <SectionLabel>Da consegnare oggi ({consegneOggi.length})</SectionLabel>
          {consegneOggi.length === 0 ? (
            <EmptyState message="Nessuna consegna prevista oggi" />
          ) : (
            <div style={CARD_STYLE}>
              {consegneOggi.map((l) => (
                <LavoroUrgente
                  key={l.id}
                  id={l.id}
                  numero_lavoro={l.numero_lavoro}
                  stato={l.stato}
                  priorita="normale"
                  cliente_display={l.cliente_display}
                  descrizione={l.descrizione}
                  data_consegna_prevista={l.data_consegna_prevista}
                  ora_consegna={l.ora_consegna}
                  paziente_nome_snapshot={l.paziente_nome_snapshot}
                />
              ))}
            </div>
          )}
        </motion.section>
      </AnimatePresence>

      {/* Sezione: Lavori in ritardo */}
      {lavoriInRitardo.length > 0 && (
        <motion.section
          variants={sectionVariants}
          initial={reducedMotion ? {} : 'hidden'}
          animate="visible"
          transition={{ ...t('normal', 'enter'), delay: reducedMotion ? 0 : 0.1 }}
          style={{ padding: '0 20px 16px' }}
        >
          <SectionLabel>In ritardo ({lavoriInRitardo.length})</SectionLabel>
          <div style={CARD_STYLE}>
            {lavoriInRitardo.map((l) => (
              <LavoroUrgente
                key={l.id}
                id={l.id}
                numero_lavoro={l.numero_lavoro}
                stato={l.stato}
                priorita={l.priorita}
                cliente_display={l.cliente_display}
                descrizione={l.descrizione}
                data_consegna_prevista={l.data_consegna_prevista}
                ora_consegna={l.ora_consegna}
                paziente_nome_snapshot={l.paziente_nome_snapshot}
                is_urgente
              />
            ))}
          </div>
        </motion.section>
      )}

      {/* Sezione: In prova esterna — rientro atteso */}
      {inProvaRientro.length > 0 && (
        <motion.section
          variants={sectionVariants}
          initial={reducedMotion ? {} : 'hidden'}
          animate="visible"
          transition={{ ...t('normal', 'enter'), delay: reducedMotion ? 0 : 0.15 }}
          style={{ padding: '0 20px 16px' }}
        >
          <SectionLabel>In prova esterna — rientro atteso</SectionLabel>
          <div style={CARD_STYLE}>
            {inProvaRientro.map((l) => {
              const display = l.clienti
                ? l.clienti.studio_nome ?? `${l.clienti.nome} ${l.clienti.cognome}`
                : '—'
              return (
                <LavoroUrgente
                  key={l.id}
                  id={l.id}
                  numero_lavoro={l.numero_lavoro}
                  stato="in_prova"
                  priorita="normale"
                  cliente_display={display}
                  descrizione={l.descrizione}
                  data_consegna_prevista={l.data_prima_prova ?? ''}
                  ora_consegna={null}
                  paziente_nome_snapshot={null}
                />
              )
            })}
          </div>
        </motion.section>
      )}

      {/* Sezione: Materiali in esaurimento */}
      {materialiEsaurimento.length > 0 && (
        <motion.section
          variants={sectionVariants}
          initial={reducedMotion ? {} : 'hidden'}
          animate="visible"
          transition={{ ...t('normal', 'enter'), delay: reducedMotion ? 0 : 0.2 }}
          style={{ padding: '0 20px 16px' }}
        >
          <SectionLabel>Materiali in esaurimento</SectionLabel>
          <div style={CARD_STYLE}>
            {materialiEsaurimento.map((m) => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(136,153,204,0.12)',
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: m.scorta_attuale === 0 ? '#FA5252' : '#FD7E14',
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#F0F4FF',
                    flex: 1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {m.nome}
                </span>
                <span
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: m.scorta_attuale === 0 ? '#FA5252' : '#FD7E14',
                    flexShrink: 0,
                  }}
                  aria-label={`Scorta: ${m.scorta_attuale} su ${m.scorta_minima} ${m.um_acquisto}`}
                >
                  {m.scorta_attuale} / {m.scorta_minima} {m.um_acquisto}
                </span>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Sezione: Pagamenti scaduti */}
      {stats.pagamenti_scaduti_totale > 0 && (
        <motion.section
          variants={sectionVariants}
          initial={reducedMotion ? {} : 'hidden'}
          animate="visible"
          transition={{ ...t('normal', 'enter'), delay: reducedMotion ? 0 : 0.25 }}
          style={{ padding: '0 20px 16px' }}
        >
          <SectionLabel>Pagamenti scaduti</SectionLabel>
          <div
            style={{
              ...CARD_STYLE,
              padding: '16px',
            }}
          >
            {/* Totale + conteggio clienti */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
              }}
            >
              <div>
                <p
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '12px',
                    color: '#8899CC',
                    margin: '0 0 4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Totale insoluto
                </p>
                <span
                  style={{
                    fontFamily: 'Playfair Display, Georgia, serif',
                    fontSize: '28px',
                    fontWeight: 700,
                    color: '#FA5252',
                  }}
                >
                  {formatEuro(stats.pagamenti_scaduti_totale)}
                </span>
              </div>
              <div
                style={{
                  background: 'rgba(250,82,82,0.12)',
                  borderRadius: '12px',
                  padding: '8px 14px',
                  textAlign: 'center',
                }}
              >
                <span
                  style={{
                    fontFamily: 'Playfair Display, Georgia, serif',
                    fontSize: '22px',
                    fontWeight: 700,
                    color: '#FA5252',
                    display: 'block',
                  }}
                  aria-label={`${stats.pagamenti_scaduti_clienti_count} clienti con insoluti`}
                >
                  {stats.pagamenti_scaduti_clienti_count}
                </span>
                <span
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '10px',
                    color: '#8899CC',
                    display: 'block',
                    marginTop: '2px',
                  }}
                >
                  clienti
                </span>
              </div>
            </div>
            {/* Top 3 clienti */}
            {pagamentiTop.map((p) => (
              <div
                key={p.cliente_id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderTop: '1px solid rgba(136,153,204,0.12)',
                }}
              >
                <span
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#F0F4FF',
                  }}
                >
                  {p.cliente_display}
                </span>
                <span
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#FA5252',
                  }}
                >
                  {formatEuro(p.residuo)}
                </span>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Sezione: Fatturato comparativo */}
      <motion.section
        variants={sectionVariants}
        initial={reducedMotion ? {} : 'hidden'}
        animate="visible"
        transition={{ ...t('normal', 'enter'), delay: reducedMotion ? 0 : 0.3 }}
        style={{ padding: '0 20px 16px' }}
      >
        <SectionLabel>Fatturato</SectionLabel>
        <div
          style={{
            ...CARD_STYLE,
            display: 'flex',
            gap: '0',
            padding: '16px',
          }}
        >
          {/* Mese corrente */}
          <div style={{ flex: 1 }}>
            <p
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '11px',
                fontWeight: 500,
                color: '#8899CC',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                margin: '0 0 6px',
              }}
            >
              {new Date().toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
            </p>
            <span
              style={{
                fontFamily: 'Playfair Display, Georgia, serif',
                fontSize: '26px',
                fontWeight: 700,
                color: '#F0F4FF',
                display: 'block',
              }}
              aria-label={`Fatturato mese corrente: ${formatEuro(stats.fatturato_mese)}`}
            >
              {formatEuro(stats.fatturato_mese)}
            </span>
            {stats.fatturato_mese_precedente > 0 && (
              <span
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: delta.up ? '#2ECC9A' : '#FA5252',
                  marginTop: '4px',
                  display: 'block',
                }}
              >
                {delta.up ? '+' : '-'}{delta.perc}% vs mese prec.
              </span>
            )}
          </div>

          {/* Divisore */}
          <div
            aria-hidden="true"
            style={{
              width: '1px',
              background: 'rgba(136,153,204,0.2)',
              margin: '4px 16px',
            }}
          />

          {/* Mese precedente */}
          <div style={{ flex: 1 }}>
            <p
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '11px',
                fontWeight: 500,
                color: '#8899CC',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                margin: '0 0 6px',
              }}
            >
              {(() => {
                const d = new Date()
                d.setMonth(d.getMonth() - 1)
                return d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
              })()}
            </p>
            <span
              style={{
                fontFamily: 'Playfair Display, Georgia, serif',
                fontSize: '26px',
                fontWeight: 700,
                color: '#8899CC',
                display: 'block',
              }}
              aria-label={`Fatturato mese precedente: ${formatEuro(stats.fatturato_mese_precedente)}`}
            >
              {formatEuro(stats.fatturato_mese_precedente)}
            </span>
          </div>
        </div>
      </motion.section>
    </div>
  )
}
```

**Commit Task 5:**
```bash
git add src/components/features/dashboard/DashboardTitolare.tsx
git commit -m "feat(dashboard): DashboardTitolare — 6 sezioni RBAC (consegne, ritardi, prova, materiali, pagamenti, fatturato)"
```

---

## Task 6: Vista DashboardTecnico

**File:**
- Create: `src/components/features/dashboard/DashboardTecnico.tsx`

- [ ] **6.1 Crea il componente**

```typescript
// src/components/features/dashboard/DashboardTecnico.tsx
'use client'

import { motion } from 'motion/react'
import { t, useReducedMotion } from '@/design-system/motion'
import { LavoroUrgente } from './LavoroUrgente'
import type { TecnicoDashboard } from '@/types/domain'

interface DashboardTecnicoProps {
  dashboard: TecnicoDashboard
  nomeUtente: string
}

const SECTION_LABEL: React.CSSProperties = {
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '11px',
  fontWeight: 600,
  color: '#8899CC',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  margin: '0 0 8px',
}

const CARD: React.CSSProperties = {
  background: '#1B2D6B',
  borderRadius: '20px',
  overflow: 'hidden',
  boxShadow:
    '-3px -3px 7px hsl(220 80% 35% / 0.55), 5px 5px 14px hsl(230 100% 4% / 0.95)',
}

function EmptyCard({ message }: { message: string }) {
  return (
    <div
      style={{
        background: '#1B2D6B',
        borderRadius: '20px',
        padding: '24px 20px',
        textAlign: 'center',
        boxShadow: '-2px -2px 5px hsl(220 80% 35% / 0.4), 3px 3px 8px hsl(230 100% 4% / 0.8)',
      }}
    >
      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#8899CC', margin: 0 }}>
        {message}
      </p>
    </div>
  )
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h >= 6 && h < 12) return 'Ciao'
  if (h >= 12 && h < 17) return 'Buon pomeriggio'
  return 'Buonasera'
}

export function DashboardTecnico({ dashboard, nomeUtente }: DashboardTecnicoProps) {
  const reducedMotion = useReducedMotion()
  const today = new Date().toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const sectionVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0 },
  }

  return (
    <div style={{ paddingBottom: '88px' }}>
      <header style={{ padding: '20px 20px 16px' }}>
        <h1
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '20px',
            fontWeight: 700,
            color: '#F0F4FF',
            margin: 0,
          }}
        >
          {getGreeting()}, {nomeUtente}
        </h1>
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '13px',
            color: '#8899CC',
            margin: '2px 0 0',
          }}
        >
          I tuoi lavori · {today}
        </p>
      </header>

      {/* URGENTI / IN RITARDO */}
      <motion.section
        variants={sectionVariants}
        initial={reducedMotion ? {} : 'hidden'}
        animate="visible"
        transition={{ ...t('normal', 'enter'), delay: reducedMotion ? 0 : 0.05 }}
        style={{ padding: '0 20px 16px' }}
      >
        <h2 style={SECTION_LABEL}>
          Urgenti / in ritardo ({dashboard.lavori_urgenti.length})
        </h2>
        {dashboard.lavori_urgenti.length === 0 ? (
          <EmptyCard message="Nessun lavoro urgente o in ritardo" />
        ) : (
          <div style={CARD}>
            {dashboard.lavori_urgenti.map((l) => (
              <LavoroUrgente
                key={l.id}
                id={l.id}
                numero_lavoro={l.numero_lavoro}
                stato={l.stato}
                priorita={l.priorita}
                cliente_display={l.cliente_display}
                descrizione={l.descrizione}
                data_consegna_prevista={l.data_consegna_prevista}
                ora_consegna={l.ora_consegna}
                paziente_nome_snapshot={l.paziente_nome_snapshot}
                is_urgente
              />
            ))}
          </div>
        )}
      </motion.section>

      {/* LAVORI ASSEGNATI OGGI */}
      <motion.section
        variants={sectionVariants}
        initial={reducedMotion ? {} : 'hidden'}
        animate="visible"
        transition={{ ...t('normal', 'enter'), delay: reducedMotion ? 0 : 0.1 }}
        style={{ padding: '0 20px 16px' }}
      >
        <h2 style={SECTION_LABEL}>
          Lavori assegnati oggi ({dashboard.lavori_oggi.length})
        </h2>
        {dashboard.lavori_oggi.length === 0 ? (
          <EmptyCard message="Nessun lavoro in consegna oggi" />
        ) : (
          <div style={CARD}>
            {dashboard.lavori_oggi.map((l) => (
              <LavoroUrgente
                key={l.id}
                id={l.id}
                numero_lavoro={l.numero_lavoro}
                stato={l.stato}
                priorita={l.priorita}
                cliente_display={l.cliente_display}
                descrizione={l.descrizione}
                data_consegna_prevista={l.data_consegna_prevista}
                ora_consegna={l.ora_consegna}
                paziente_nome_snapshot={l.paziente_nome_snapshot}
              />
            ))}
          </div>
        )}
      </motion.section>

      {/* IN PROVA — RIENTRANO OGGI */}
      {dashboard.in_prova_rientro_oggi.length > 0 && (
        <motion.section
          variants={sectionVariants}
          initial={reducedMotion ? {} : 'hidden'}
          animate="visible"
          transition={{ ...t('normal', 'enter'), delay: reducedMotion ? 0 : 0.15 }}
          style={{ padding: '0 20px 16px' }}
        >
          <h2 style={SECTION_LABEL}>
            Miei lavori in prova — rientrano oggi ({dashboard.in_prova_rientro_oggi.length})
          </h2>
          <div style={CARD}>
            {dashboard.in_prova_rientro_oggi.map((l) => (
              <LavoroUrgente
                key={l.id}
                id={l.id}
                numero_lavoro={l.numero_lavoro}
                stato={l.stato}
                priorita={l.priorita}
                cliente_display={l.cliente_display}
                descrizione={l.descrizione}
                data_consegna_prevista={l.data_consegna_prevista}
                ora_consegna={l.ora_consegna}
                paziente_nome_snapshot={l.paziente_nome_snapshot}
              />
            ))}
          </div>
        </motion.section>
      )}
    </div>
  )
}
```

**Commit Task 6:**
```bash
git add src/components/features/dashboard/DashboardTecnico.tsx
git commit -m "feat(dashboard): DashboardTecnico — 3 sezioni per ruolo tecnico (urgenti, oggi, prove rientro)"
```

---

## Task 7: Vista DashboardFrontDesk

**File:**
- Create: `src/components/features/dashboard/DashboardFrontDesk.tsx`

- [ ] **7.1 Crea il componente**

```typescript
// src/components/features/dashboard/DashboardFrontDesk.tsx
'use client'

import { motion } from 'motion/react'
import { t, useReducedMotion } from '@/design-system/motion'
import { LavoroUrgente } from './LavoroUrgente'
import type { FrontDeskDashboard, FrontDeskPagamentoScaduto } from '@/types/domain'

interface DashboardFrontDeskProps {
  dashboard: FrontDeskDashboard
  nomeUtente: string
}

const SECTION_LABEL: React.CSSProperties = {
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '11px',
  fontWeight: 600,
  color: '#8899CC',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  margin: '0 0 8px',
}

const CARD: React.CSSProperties = {
  background: '#1B2D6B',
  borderRadius: '20px',
  overflow: 'hidden',
  boxShadow:
    '-3px -3px 7px hsl(220 80% 35% / 0.55), 5px 5px 14px hsl(230 100% 4% / 0.95)',
}

function EmptyCard({ message }: { message: string }) {
  return (
    <div
      style={{
        background: '#1B2D6B',
        borderRadius: '20px',
        padding: '24px 20px',
        textAlign: 'center',
        boxShadow: '-2px -2px 5px hsl(220 80% 35% / 0.4), 3px 3px 8px hsl(230 100% 4% / 0.8)',
      }}
    >
      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#8899CC', margin: 0 }}>
        {message}
      </p>
    </div>
  )
}

function formatEuro(n: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n)
}

function buildWhatsappUrl(telefono: string): string {
  const tel = telefono.replace(/\D/g, '')
  const full = tel.startsWith('39') ? tel : `39${tel}`
  // GDPR-safe: no dati sensibili paziente nel testo del messaggio
  const testo = encodeURIComponent(
    `Buongiorno, la contatto riguardo ai lavori in sospeso presso il nostro laboratorio. La prego di mettersi in contatto con noi per regolarizzare la situazione. Grazie.`
  )
  return `https://wa.me/${full}?text=${testo}`
}

function PagamentoCard({ item }: { item: FrontDeskPagamentoScaduto }) {
  return (
    <div
      style={{
        padding: '14px 16px',
        borderBottom: '1px solid rgba(136,153,204,0.12)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '4px',
        }}
      >
        <span
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '15px',
            fontWeight: 600,
            color: '#F0F4FF',
          }}
        >
          {item.cliente_display}
        </span>
        <span
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '15px',
            fontWeight: 700,
            color: '#FA5252',
          }}
        >
          {formatEuro(item.residuo_totale)}
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '12px',
            color: '#8899CC',
          }}
        >
          Scaduto da {item.giorni_scaduto}gg · {item.lavori_count} lavori
        </span>
        {item.cliente_telefono && (
          <a
            href={buildWhatsappUrl(item.cliente_telefono)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Contatta ${item.cliente_display} via WhatsApp`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: 'rgba(250,82,82,0.1)',
              border: '1px solid rgba(250,82,82,0.25)',
              borderRadius: '10px',
              padding: '5px 10px',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '12px',
              fontWeight: 600,
              color: '#FA5252',
              textDecoration: 'none',
              minHeight: '32px',
            }}
          >
            WhatsApp
          </a>
        )}
      </div>
    </div>
  )
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h >= 6 && h < 12) return 'Buongiorno'
  if (h >= 12 && h < 17) return 'Buon pomeriggio'
  return 'Buonasera'
}

export function DashboardFrontDesk({ dashboard, nomeUtente }: DashboardFrontDeskProps) {
  const reducedMotion = useReducedMotion()
  const today = new Date().toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const sectionVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0 },
  }

  return (
    <div style={{ paddingBottom: '88px' }}>
      <header style={{ padding: '20px 20px 16px' }}>
        <h1
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '20px',
            fontWeight: 700,
            color: '#F0F4FF',
            margin: 0,
          }}
        >
          {getGreeting()}, {nomeUtente}
        </h1>
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '13px',
            color: '#8899CC',
            margin: '2px 0 0',
          }}
        >
          Ricezione · {today}
        </p>
      </header>

      {/* DA CONSEGNARE OGGI */}
      <motion.section
        variants={sectionVariants}
        initial={reducedMotion ? {} : 'hidden'}
        animate="visible"
        transition={{ ...t('normal', 'enter'), delay: reducedMotion ? 0 : 0.05 }}
        style={{ padding: '0 20px 16px' }}
      >
        <h2 style={SECTION_LABEL}>
          Da consegnare oggi ({dashboard.consegne_oggi.length})
        </h2>
        {dashboard.consegne_oggi.length === 0 ? (
          <EmptyCard message="Nessuna consegna prevista oggi" />
        ) : (
          <div style={CARD}>
            {dashboard.consegne_oggi.map((l) => (
              <LavoroUrgente
                key={l.id}
                id={l.id}
                numero_lavoro={l.numero_lavoro}
                stato={l.stato}
                priorita="normale"
                cliente_display={l.cliente_display}
                descrizione={l.descrizione}
                data_consegna_prevista={l.data_consegna_prevista}
                ora_consegna={l.ora_consegna}
                paziente_nome_snapshot={l.paziente_nome_snapshot}
              />
            ))}
          </div>
        )}
      </motion.section>

      {/* RITIRI ATTESI OGGI */}
      <motion.section
        variants={sectionVariants}
        initial={reducedMotion ? {} : 'hidden'}
        animate="visible"
        transition={{ ...t('normal', 'enter'), delay: reducedMotion ? 0 : 0.1 }}
        style={{ padding: '0 20px 16px' }}
      >
        <h2 style={SECTION_LABEL}>
          Ritiri attesi oggi ({dashboard.ritiri_attesi_oggi.length})
        </h2>
        {dashboard.ritiri_attesi_oggi.length === 0 ? (
          <EmptyCard message="Nessun ritiro atteso oggi" />
        ) : (
          <div style={CARD}>
            {dashboard.ritiri_attesi_oggi.map((l) => (
              <LavoroUrgente
                key={l.id}
                id={l.id}
                numero_lavoro={l.numero_lavoro}
                stato={l.stato}
                priorita="normale"
                cliente_display={l.cliente_display}
                descrizione={l.descrizione}
                data_consegna_prevista={l.data_consegna_prevista}
                ora_consegna={l.ora_consegna}
                paziente_nome_snapshot={l.paziente_nome_snapshot}
              />
            ))}
          </div>
        )}
      </motion.section>

      {/* IN PROVA — RIENTRANO OGGI */}
      {dashboard.in_prova_rientro_oggi.length > 0 && (
        <motion.section
          variants={sectionVariants}
          initial={reducedMotion ? {} : 'hidden'}
          animate="visible"
          transition={{ ...t('normal', 'enter'), delay: reducedMotion ? 0 : 0.15 }}
          style={{ padding: '0 20px 16px' }}
        >
          <h2 style={SECTION_LABEL}>
            In prova — rientrano oggi ({dashboard.in_prova_rientro_oggi.length})
          </h2>
          <div style={CARD}>
            {dashboard.in_prova_rientro_oggi.map((l) => (
              <LavoroUrgente
                key={l.id}
                id={l.id}
                numero_lavoro={l.numero_lavoro}
                stato={l.stato}
                priorita="normale"
                cliente_display={l.cliente_display}
                descrizione={l.descrizione}
                data_consegna_prevista={l.data_consegna_prevista}
                ora_consegna={l.ora_consegna}
                paziente_nome_snapshot={l.paziente_nome_snapshot}
              />
            ))}
          </div>
        </motion.section>
      )}

      {/* DA CONTATTARE — insoluti >30gg */}
      {dashboard.da_contattare.length > 0 && (
        <motion.section
          variants={sectionVariants}
          initial={reducedMotion ? {} : 'hidden'}
          animate="visible"
          transition={{ ...t('normal', 'enter'), delay: reducedMotion ? 0 : 0.2 }}
          style={{ padding: '0 20px 16px' }}
        >
          <h2 style={SECTION_LABEL}>
            Da contattare — insoluto &gt;30gg ({dashboard.da_contattare.length})
          </h2>
          <div style={{ ...CARD, overflow: 'visible' }}>
            {dashboard.da_contattare.map((item) => (
              <PagamentoCard key={item.cliente_id} item={item} />
            ))}
          </div>
        </motion.section>
      )}
    </div>
  )
}
```

**Commit Task 7:**
```bash
git add src/components/features/dashboard/DashboardFrontDesk.tsx
git commit -m "feat(dashboard): DashboardFrontDesk — 4 sezioni (consegne, ritiri, prove rientro, insoluti WhatsApp)"
```

---

## Task 8: Dashboard Page — RBAC Routing

**File:**
- Modify: `src/app/(app)/dashboard/page.tsx`

- [ ] **8.1 Riscrivi la page con RBAC routing**

La dashboard page è un Server Component. Carica i dati per il ruolo corretto,
poi renderizza il componente adeguato. Il routing RBAC avviene lato server — il
client non riceve dati che non gli appartengono.

```typescript
// src/app/(app)/dashboard/page.tsx
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { PageWrapper } from '@/components/layout/PageWrapper'
import {
  getTitolareKpi,
  getTecnicoDashboard,
  getFrontDeskDashboard,
  getPagamentiScadutiTop,
  getMaterialiEsaurimento,
  getLavoriInProvaRientro,
} from '@/lib/dashboard/queries'
import { isCacheStale } from '@/lib/dashboard/cache-stale'
import { DashboardTitolare } from '@/components/features/dashboard/DashboardTitolare'
import { DashboardTecnico } from '@/components/features/dashboard/DashboardTecnico'
import { DashboardFrontDesk } from '@/components/features/dashboard/DashboardFrontDesk'
import type { StatoLavoro, PrioritaLavoro, TipoDispositivo } from '@/types/domain'

export default async function DashboardPage() {
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  // Redirect gestito in AppLayout — qui user è garantito non-null
  if (!user) return null

  const svc = getServiceClient()

  // ─── Carica utente con ruolo ──────────────────────────────────
  const { data: utente } = await svc
    .from('utenti')
    .select('nome, cognome, ruolo, laboratorio_id, id')
    .eq('id', user.id)
    .is('deleted_at', null)
    .single()

  if (!utente) return null

  const { ruolo, laboratorio_id: labId } = utente
  const nomeUtente = utente.nome ?? user.email ?? 'Utente'

  // ─── Carica nome laboratorio ──────────────────────────────────
  const { data: lab } = await svc
    .from('laboratori')
    .select('nome')
    .eq('id', labId)
    .single()
  const labNome = lab?.nome ?? undefined

  // ─────────────────────────────────────────────────────────────
  // TITOLARE / admin_rete
  // ─────────────────────────────────────────────────────────────
  if (ruolo === 'titolare' || ruolo === 'admin_rete') {
    const { data: cacheRow } = await svc
      .from('dashboard_kpi_cache')
      .select('aggiornato_at')
      .eq('laboratorio_id', labId)
      .maybeSingle()

    const stale = isCacheStale(cacheRow?.aggiornato_at ?? null)
    const stats = await getTitolareKpi(svc, labId, stale)
    const [pagamentiTop, materiali, inProva] = await Promise.all([
      getPagamentiScadutiTop(svc, labId, 3),
      getMaterialiEsaurimento(svc, labId, 5),
      getLavoriInProvaRientro(svc, labId),
    ])

    // Consegne di oggi per la lista dettagliata
    const oggi = new Date().toISOString().split('T')[0]
    const { data: consegneOggiData } = await svc
      .from('lavori')
      .select('id, numero_lavoro, stato, priorita, tipo_dispositivo, descrizione, data_consegna_prevista, ora_consegna, paziente_nome_snapshot, clienti(nome, cognome, studio_nome, telefono)')
      .eq('laboratorio_id', labId)
      .is('deleted_at', null)
      .eq('data_consegna_prevista', oggi)
      .not('stato', 'in', '("consegnato","annullato")')
      .order('ora_consegna', { ascending: true, nullsFirst: false })
      .limit(30)

    // Lavori in ritardo per lista dettagliata
    const { data: ritardiData } = await svc
      .from('lavori')
      .select('id, numero_lavoro, stato, priorita, tipo_dispositivo, descrizione, data_consegna_prevista, ora_consegna, paziente_nome_snapshot, clienti(nome, cognome, studio_nome)')
      .eq('laboratorio_id', labId)
      .is('deleted_at', null)
      .eq('stato', 'in_ritardo')
      .order('data_consegna_prevista', { ascending: true })
      .limit(20)

    type ConsegnaRow = {
      id: string
      numero_lavoro: string
      stato: StatoLavoro
      priorita: PrioritaLavoro
      tipo_dispositivo: TipoDispositivo
      descrizione: string
      data_consegna_prevista: string
      ora_consegna: string | null
      paziente_nome_snapshot: string | null
      clienti: { nome: string; cognome: string; studio_nome: string | null; telefono: string | null } | null
    }

    const consegneOggi = ((consegneOggiData ?? []) as ConsegnaRow[]).map((l) => ({
      id: l.id,
      numero_lavoro: l.numero_lavoro,
      stato: l.stato,
      tipo_dispositivo: l.tipo_dispositivo,
      descrizione: l.descrizione,
      data_consegna_prevista: l.data_consegna_prevista,
      ora_consegna: l.ora_consegna,
      paziente_nome_snapshot: l.paziente_nome_snapshot,
      cliente_display: l.clienti?.studio_nome ?? (l.clienti ? `${l.clienti.nome} ${l.clienti.cognome}` : '—'),
      cliente_telefono: l.clienti?.telefono ?? null,
    }))

    type RitardoRow = {
      id: string
      numero_lavoro: string
      stato: StatoLavoro
      priorita: PrioritaLavoro
      tipo_dispositivo: TipoDispositivo
      descrizione: string
      data_consegna_prevista: string
      ora_consegna: string | null
      paziente_nome_snapshot: string | null
      clienti: { nome: string; cognome: string; studio_nome: string | null } | null
    }

    const lavoriInRitardo = ((ritardiData ?? []) as RitardoRow[]).map((l) => ({
      id: l.id,
      numero_lavoro: l.numero_lavoro,
      stato: l.stato as 'in_ritardo',
      priorita: l.priorita,
      tipo_dispositivo: l.tipo_dispositivo,
      descrizione: l.descrizione,
      data_consegna_prevista: l.data_consegna_prevista,
      ora_consegna: l.ora_consegna,
      paziente_nome_snapshot: l.paziente_nome_snapshot,
      cliente_display: l.clienti?.studio_nome ?? (l.clienti ? `${l.clienti.nome} ${l.clienti.cognome}` : '—'),
    }))

    return (
      <PageWrapper>
        <DashboardTitolare
          stats={stats}
          consegneOggi={consegneOggi}
          lavoriInRitardo={lavoriInRitardo}
          inProvaRientro={inProva}
          materialiEsaurimento={materiali}
          pagamentiTop={pagamentiTop}
          nomeUtente={nomeUtente}
          nomeLabName={labNome}
        />
      </PageWrapper>
    )
  }

  // ─────────────────────────────────────────────────────────────
  // TECNICO
  // ─────────────────────────────────────────────────────────────
  if (ruolo === 'tecnico') {
    const { data: tecnico } = await svc
      .from('tecnici')
      .select('id')
      .eq('laboratorio_id', labId)
      .eq('utente_id', user.id)
      .is('deleted_at', null)
      .maybeSingle()

    const dashData = tecnico
      ? await getTecnicoDashboard(svc, labId, tecnico.id)
      : { lavori_urgenti: [], lavori_oggi: [], in_prova_rientro_oggi: [] }

    return (
      <PageWrapper>
        <DashboardTecnico
          dashboard={dashData}
          nomeUtente={nomeUtente}
        />
      </PageWrapper>
    )
  }

  // ─────────────────────────────────────────────────────────────
  // FRONT DESK
  // ─────────────────────────────────────────────────────────────
  if (ruolo === 'front_desk') {
    const dashData = await getFrontDeskDashboard(svc, labId)
    return (
      <PageWrapper>
        <DashboardFrontDesk
          dashboard={dashData}
          nomeUtente={nomeUtente}
        />
      </PageWrapper>
    )
  }

  // Fallback — ruolo non riconosciuto (non dovrebbe accadere con RLS)
  return (
    <PageWrapper>
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <p style={{ color: '#8899CC', fontFamily: 'DM Sans, sans-serif' }}>
          Dashboard non disponibile per questo ruolo.
        </p>
      </div>
    </PageWrapper>
  )
}
```

**Commit Task 8:**
```bash
git add src/app/(app)/dashboard/page.tsx
git commit -m "feat(dashboard): RBAC routing in dashboard page — titolare/tecnico/front_desk views server-side"
```

---

## Task 9: Test Unit Completi

**File:**
- Finalize: `tests/unit/dashboard-kpi.test.ts` (già scritto nel Task 1.1 — ora verificare che passi al 100%)

- [ ] **9.1 Esegui i test unitari**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app"
npm run test:unit -- tests/unit/dashboard-kpi.test.ts 2>&1 | tail -20
# Expected output:
# PASS tests/unit/dashboard-kpi.test.ts
# Test Files  1 passed (1)
# Tests  9 passed (9)
# Duration ~200ms
```

- [ ] **9.2 Esegui tutta la suite unit**

```bash
npm run test:unit 2>&1 | tail -10
# Expected: all tests passing, no regressions
```

**Commit Task 9:**
```bash
git add tests/unit/dashboard-kpi.test.ts
git commit -m "test(dashboard): unit tests for KPI mappers and cache staleness — 8 tests passing"
```

---

## Task 10: Test E2E — RBAC Dashboard

**File:**
- Create: `tests/e2e/dashboard.spec.ts`

- [ ] **10.1 Crea il file E2E**

```typescript
// tests/e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test'

// ─── Helper di login ─────────────────────────────────────────
async function loginAs(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/login')
  await page.fill('[name="email"]', email)
  await page.fill('[name="password"]', password)
  await page.click('[type="submit"]')
  await page.waitForURL('/dashboard', { timeout: 10000 })
}

// ─── TITOLARE ────────────────────────────────────────────────
test.describe('Dashboard Titolare', () => {
  test.beforeEach(async ({ page }) => {
    // Test user: titolare configurato nel seed Supabase
    await loginAs(
      page,
      process.env.TEST_TITOLARE_EMAIL ?? 'titolare@test.local',
      process.env.TEST_TITOLARE_PASSWORD ?? 'TestPassword123!'
    )
  })

  test('mostra sezione consegne oggi', async ({ page }) => {
    await page.goto('/dashboard')
    // La sezione "Da consegnare oggi" deve essere presente
    const heading = page.getByText(/da consegnare oggi/i)
    await expect(heading).toBeVisible()
  })

  test('mostra sezione fatturato con mese corrente e precedente', async ({ page }) => {
    await page.goto('/dashboard')
    const heading = page.getByText(/fatturato/i)
    await expect(heading).toBeVisible()
    // Deve mostrare il mese corrente
    const meseCorrente = new Date().toLocaleDateString('it-IT', { month: 'long' })
    await expect(page.getByText(new RegExp(meseCorrente, 'i'))).toBeVisible()
  })

  test('KPI strip mostra chip cliccabili', async ({ page }) => {
    await page.goto('/dashboard')
    // Almeno i chip "Oggi" e "In ritardo" devono esistere (sempre visibili)
    await expect(page.getByRole('button', { name: /oggi/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /in ritardo/i })).toBeVisible()
  })

  test('click su chip "Oggi" naviga a lavori con filtro', async ({ page }) => {
    await page.goto('/dashboard')
    await page.getByRole('button', { name: /oggi/i }).click()
    await expect(page).toHaveURL(/\/lavori\?f=consegne_oggi/)
  })

  test('NON mostra sezione "Lavori assegnati a me"', async ({ page }) => {
    await page.goto('/dashboard')
    // Questa sezione è SOLO per il tecnico
    const tecnicoSection = page.getByText(/lavori assegnati a me oggi/i)
    await expect(tecnicoSection).not.toBeVisible()
  })
})

// ─── TECNICO ─────────────────────────────────────────────────
test.describe('Dashboard Tecnico', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(
      page,
      process.env.TEST_TECNICO_EMAIL ?? 'tecnico@test.local',
      process.env.TEST_TECNICO_PASSWORD ?? 'TestPassword123!'
    )
  })

  test('mostra sezione urgenti / in ritardo', async ({ page }) => {
    await page.goto('/dashboard')
    const heading = page.getByText(/urgenti \/ in ritardo/i)
    await expect(heading).toBeVisible()
  })

  test('mostra sezione lavori assegnati oggi', async ({ page }) => {
    await page.goto('/dashboard')
    const heading = page.getByText(/lavori assegnati oggi/i)
    await expect(heading).toBeVisible()
  })

  test('NON mostra sezione fatturato', async ({ page }) => {
    await page.goto('/dashboard')
    // Il tecnico non deve vedere il fatturato del lab
    const fatturatoSection = page.getByText(/^fatturato$/i)
    await expect(fatturatoSection).not.toBeVisible()
  })

  test('NON mostra sezione pagamenti scaduti', async ({ page }) => {
    await page.goto('/dashboard')
    const pagSection = page.getByText(/pagamenti scaduti/i)
    await expect(pagSection).not.toBeVisible()
  })
})

// ─── FRONT DESK ──────────────────────────────────────────────
test.describe('Dashboard Front Desk', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(
      page,
      process.env.TEST_FRONTDESK_EMAIL ?? 'frontdesk@test.local',
      process.env.TEST_FRONTDESK_PASSWORD ?? 'TestPassword123!'
    )
  })

  test('mostra sezione da consegnare oggi', async ({ page }) => {
    await page.goto('/dashboard')
    const heading = page.getByText(/da consegnare oggi/i)
    await expect(heading).toBeVisible()
  })

  test('mostra sezione ritiri attesi oggi', async ({ page }) => {
    await page.goto('/dashboard')
    const heading = page.getByText(/ritiri attesi oggi/i)
    await expect(heading).toBeVisible()
  })

  test('NON mostra sezione fatturato comparativo', async ({ page }) => {
    await page.goto('/dashboard')
    const fatturatoSection = page.getByText(/^fatturato$/i)
    await expect(fatturatoSection).not.toBeVisible()
  })

  test('NON mostra KPI strip operativa del titolare', async ({ page }) => {
    await page.goto('/dashboard')
    // La KPI strip con chip "Da fatt." e "MDR" è solo per titolare
    const mdrChip = page.getByRole('button', { name: /mdr/i })
    await expect(mdrChip).not.toBeVisible()
  })

  test('link WhatsApp sollecito rispetta formato GDPR-safe', async ({ page }) => {
    await page.goto('/dashboard')
    // Se ci sono insoluti, il link WA non deve contenere nomi paziente
    const waLinks = page.locator('a[href^="https://wa.me/"]')
    const count = await waLinks.count()
    if (count > 0) {
      const href = await waLinks.first().getAttribute('href')
      expect(href).not.toMatch(/paziente|patient|nome|cognome/i)
    }
  })
})
```

- [ ] **10.2 Esegui E2E (con server running)**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app"
npm run test:e2e -- tests/e2e/dashboard.spec.ts 2>&1 | tail -20
# Expected: tutte le sezioni RBAC visibili per il ruolo corretto,
# sezioni proibite non visibili.
# Note: richiede TEST_TITOLARE_EMAIL, TEST_TECNICO_EMAIL, TEST_FRONTDESK_EMAIL
# nel .env.local con utenti pre-creati nel seed.
```

**Commit Task 10:**
```bash
git add tests/e2e/dashboard.spec.ts
git commit -m "test(e2e): dashboard RBAC — 12 test per 3 ruoli, verifica visibilità sezioni e isolamento dati"
```

---

## Self-Review

### Correttezza architetturale

**Cache split:** La decisione di usare `dashboard_kpi_cache` solo per titolare/admin_rete
e query dirette per tecnico/front_desk è corretta. La cache ha chiave `laboratorio_id`
— non può contenere dati per-utente senza ridisegno completo. Il piano non prova a
piegare lo schema in modo sbagliato.

**On-demand refresh:** Il pattern "leggi `aggiornato_at` → se stale, chiama
`refresh_dashboard_cache` via RPC → rileggi" garantisce che il titolare veda
dati aggiornati anche se il cron pg_cron ha saltato un ciclo. Il costo è
una singola RPC call sincrona (~50-100ms sul DB) quando la cache è fredda.

**Dipendenza da Piano B:** `lavori_partitario` esiste già nella migration 002 —
il piano non è bloccato. Le query su residuo pagamenti funzionano anche con
il partitario vuoto (restituisce 0 per tutti i clienti).

**RBAC server-side:** Il routing RBAC avviene nel Server Component della dashboard page.
Il client React non riceve mai dati di un altro ruolo — non c'è filtro client-side
che può essere aggirato. Il middleware non fa enforcement granulare dei ruoli (CLAUDE.md
dice che è solo per redirect visivi), l'enforcement reale è qui nel Server Component
+ RLS sul DB.

### Rischi identificati

**getMaterialiEsaurimento usa filtro JS:** Supabase non supporta confronto tra colonne
nella query (`scorta_attuale <= scorta_minima`). La funzione usa filtro JS post-query
sulla risposta. Con tabelle grandi (>1000 articoli attivi) questo può diventare lento.
Soluzione futura: aggiungere una colonna `is_sotto_scorta` aggiornata da trigger.
Per il go-live V1 (laboratori con <100 articoli) il filtro JS è accettabile.

**`getMaterialiEsaurimento` — filtro column comparison:** Supabase non supporta
`scorta_attuale <= scorta_minima` come filtro lato DB. La funzione usa `.gt('scorta_minima', 0)`
lato DB per pre-filtrare il sottoinsieme rilevante, poi `.filter()` JS per il confronto
tra colonne. Con <100 articoli per lab V1 il costo è trascurabile. La migrazione futura
può aggiungere una colonna `is_sotto_scorta boolean GENERATED ALWAYS AS (scorta_attuale <= scorta_minima) STORED`
per eliminare il filtro JS. **Fix già applicato nel codice del piano.**

**Tecnico non collegato a profilo tecnico:** Se un utente ha `ruolo = 'tecnico'` ma
non esiste nella tabella `tecnici` (non ancora collegato dal titolare), la dashboard
mostra una vista vuota con messaggio implicito. Il componente `DashboardTecnico`
con array vuoti mostrerà le sezioni con "Nessun lavoro" — comportamento corretto.

**pg_cron doppia definizione:** La migration include sia `CREATE EXTENSION IF NOT EXISTS pg_cron`
che `cron.unschedule()` con un pattern che usa subquery WHERE EXISTS. Verificare che
`cron.unschedule` accetti questo pattern nella versione pg_cron installata in Supabase.
Alternativa sicura: wrappare in un blocco DO $$ ... $$ con EXCEPTION WHEN others THEN NULL.

### Conformità alle linee guida

- Motion: tutti i componenti importano `{ t, useReducedMotion }` da `@/design-system/motion`.
  Zero valori `duration`/`ease` inline. `staggerDelay()` usato per la KPI strip.
- Haptimorphism: shadow recipe corretta su tutti i componenti. Superfici `#1B2D6B`,
  sfondo `#0F1E52`. Oro `#D4A843` usato solo per timestamp consegna.
- Font: Playfair Display per numeri hero (KPI chip, totali euro). DM Sans per tutto il resto.
- Touch target: chip KPI strip in `DashboardTitolare` hanno `minHeight: '52px'` esplicito.
  Link lavori `LavoroUrgente` hanno `padding: 14px 16px` + `min-height: 44px` implicita sui contenuti.
- Touch target: chip KPI in `DashboardTitolare` hanno `minHeight: '52px'` esplicito.
  `LavoroUrgente` ha padding `14px 16px` con altezza naturale >52px. `KpiCard` buttons
  hanno `minWidth: 140px` e padding sufficiente.
- Accessibilità: `aria-label` su tutti i valori numerici. `aria-hidden="true"` su indicatori
  colore decorativi. `role="region"` su KpiCard non interattiva. Link `<time>` con `dateTime`.
- GDPR WhatsApp: il testo del messaggio precompilato non contiene dati paziente né dati
  sensibili — conforme alla regola Piano A (CLAUDE.md §6 e file 17 analisi).
- `stato_sdi` enum: il filtro fatturato usa `NOT IN ('draft','scartata','errore')` allineato
  alla definizione CHECK in migration 005 (Piano A), non 'rifiutata' che non esiste nel DB.
- `buildWhatsappUrl`: accetta solo `telefono` — nessun parametro `nomeCliente` inutilizzato.

### Cosa NON è in questo piano (deliberatamente)

- **Grafico fatturato sparkline:** Richiede una libreria charting (recharts/visx). Aggiunto
  in Piano D se Francesco lo approva nel mockup.
- **Notifiche push per consegne urgenti:** Richiede Service Worker push + subscription.
  Piano E (PWA offline features).
- **Refresh automatico della dashboard senza reload:** useDashboard hook esiste ma
  la dashboard page è SSR. Convertire a polling client-side richiede refactor
  significativo — discussione separata con Francesco.
- **Vista admin_rete multi-lab:** Il ruolo `admin_rete` riceve la stessa vista del
  titolare ma filtrata per il proprio lab. La vista aggregata multi-lab (ReteDashboard)
  è Fase 3 del roadmap.

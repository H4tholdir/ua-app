// promemoria-verifica.js — hook Stop (D197, PIPELINE-3 Fase 0).
//
// Che cosa fa: quando la sessione si ferma, se ci sono modifiche NON committate a file di
// codice più RECENTI dell'ultima verifica riuscita (marcatore .claude/state/ultima-verifica,
// scritto da `npm run verify:fast` / `verify:full`), emette un systemMessage che ricorda di
// lanciare la verifica. NON blocca mai (nessun decision:block): convive con remind-bp1.js
// (promemoria memoria, livello utente) e con claude-mem (summarize, plugin), che continuano
// a girare invariati — gli hook di user/progetto/plugin si sommano.
//
// Stile fail-safe come remind-bp1.js: qualunque errore → exit 0 silenzioso. Un promemoria
// che esplode non deve mai impedire a una sessione di chiudersi.
"use strict";

const { execSync } = require("node:child_process");
const { readFileSync, statSync } = require("node:fs");

function main(input) {
  // Anti-loop: se lo stop è già stato processato da un giro di hook, silenzio.
  if (input && input.stop_hook_active) return null;

  const porcelain = execSync("git status --porcelain", {
    encoding: "utf8",
    timeout: 5000,
  });

  // Solo modifiche a file che la verifica copre davvero: codice, test, schema, script, config di build.
  const RILEVANTI = /^(src|tests|supabase|scripts)\/|^(package\.json|package-lock\.json|tsconfig\.json|next\.config\.ts|vitest\.config\.ts|eslint\.config\.mjs)$/;
  const modificati = porcelain
    .split("\n")
    .filter(Boolean)
    .map((r) => r.slice(3).replace(/^"|"$/g, ""))
    .map((r) => (r.includes(" -> ") ? r.split(" -> ")[1] : r))
    .filter((f) => RILEVANTI.test(f));
  if (modificati.length === 0) return null; // sessione di soli documenti o sola lettura

  let ultimaVerifica = 0;
  try {
    ultimaVerifica = JSON.parse(readFileSync(".claude/state/ultima-verifica", "utf8")).epoch || 0;
  } catch {
    /* mai verificato su questa macchina */
  }

  let modificaPiuRecente = 0;
  for (const f of modificati) {
    try {
      modificaPiuRecente = Math.max(modificaPiuRecente, statSync(f).mtimeMs);
    } catch {
      /* file cancellato: conta come modifica, ma senza mtime */
      modificaPiuRecente = Math.max(modificaPiuRecente, Date.now());
    }
  }

  if (ultimaVerifica >= modificaPiuRecente) return null; // verificato dopo l'ultima modifica

  const elenco = modificati.slice(0, 5).join(", ") + (modificati.length > 5 ? ` (+${modificati.length - 5})` : "");
  return {
    systemMessage:
      `⚠️ PROMEMORIA VERIFICA (PIPELINE-3): ci sono modifiche di codice non ancora verificate ` +
      `(${elenco}). Prima di dichiarare chiuso il lavoro: \`npm run verify:fast\` ` +
      `(o \`npm run verify:full\` a fine ondata). La regola è FASE 7 di CLAUDE.md §0C: ` +
      `output reale, mai asserzioni.`,
  };
}

try {
  let raw = "";
  process.stdin.on("data", (d) => (raw += d));
  process.stdin.on("end", () => {
    try {
      let input = null;
      try {
        input = JSON.parse(raw);
      } catch {}
      const out = main(input);
      if (out) process.stdout.write(JSON.stringify(out));
      process.exit(0);
    } catch {
      process.exit(0);
    }
  });
} catch {
  process.exit(0);
}

// segna-verifica.mjs — scrive il marcatore di "ultima verifica riuscita".
//
// Chi lo chiama: SOLO gli script npm `verify:fast` e `verify:full` (package.json), come
// ULTIMO passo della catena `&&` — quindi il marcatore esiste solo se tutti i comandi
// precedenti sono usciti verdi. Il promemoria di fine sessione
// (.claude/hooks/promemoria-verifica.js) confronta questo marcatore con l'orario delle
// modifiche non committate: se le modifiche sono più recenti della verifica, avvisa.
//
// Il marcatore vive in .claude/state/ (ignorato da git: è stato locale della macchina,
// come tsconfig.tsbuildinfo). Formato: una riga JSON con livello e orario, leggibile a occhio.
//
// Uso: node scripts/segna-verifica.mjs <fast|full>
import { mkdirSync, writeFileSync } from "node:fs";

const livello = process.argv[2] ?? "sconosciuto";
mkdirSync(".claude/state", { recursive: true });
writeFileSync(
  ".claude/state/ultima-verifica",
  JSON.stringify({ livello, quando: new Date().toISOString(), epoch: Date.now() }) + "\n"
);
console.log(`✅ verifica «${livello}» registrata (.claude/state/ultima-verifica)`);

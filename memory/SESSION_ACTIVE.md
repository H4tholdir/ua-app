# Sessione attiva — UÀ

🚪 **PUNTO DI RIPRESA: `docs/superpowers/plans/2026-08-03-tinte-manufatto.md`** — **riga 6** di roadmap, ondata «le tinte del manufatto». Ramo `tinte-manufatto` nel repo principale (🛑 mai un worktree). **3 task su 9 fatti e salvati**, il prossimo è il **Task 4** (`risolviTinta`, la normalizzazione server-side).

🔎 **LEGGERE PRIMA DI FIDARSI DEL PIANO:** in fondo al piano ci sono i **RITROVAMENTI ESEGUENDO** dei Task 1-2-3 — **cinque difetti del piano**, uno grave.
- **T1:** il piano avrebbe creato un catalogo **scrivibile e troncabile da chiunque abbia la chiave pubblica** (nessun `REVOKE`/`GRANT`, e i privilegi predefiniti danno tutto ad `anon`). Corretto ricalcando `colori_dentali`.
- **T2:** quattro sonde su sette avrebbero toccato **zero righe** (`bite_splint` non esiste in banca dati) → verdi senza provare niente.
- **T3:** una prova era **vacua** (ciclo su elenco vuoto). R-P4: **5 su 8**, poi **6 su 8** dopo la correzione.
- **Trasversale:** i nomi di migration del piano sono **anteriori** all'ultima applicata → si usa l'orologio (D155). Vale anche per il Task 6.

📌 **MISURATO ORA** (`npm run verify:fast`): tsc 0 · eslint 0 · **vitest 4991 passate** (419 file). Due migration applicate al database vero: `tinte_manufatto` (34 righe) e le due colonne su `lavori` coi tre vincoli.

🛑 **D246 — la scheda «Foto» SI RIFÀ e si migra a v3: NON si ripara.** Le righe **19-20-21** di roadmap restano ma sono **requisiti della migrazione**, non lavoro da fare. Sopravvivono solo ① la pila d'avvisi in `position:fixed` (`ds/Avviso.tsx:294-316`), difetto **di sistema** senza urgenza, e ② la targa tagliata a metà nella frase di casa.

⚖️ **D245 — il gate L2 è dovuto quando cambia l'ASPETTO, non il solo CONTENUTO** (allora vale la FASE 9). Referto del gate arretrato: `docs/design/audit-ui-ux/LIVELLO-2-2026-08-05-caricamento-e-frasi-errore-ESITI.md`.

⛔ **Nulla è stato pubblicato:** 3 salvataggi sul ramo `tinte-manufatto`, `main` intatto.

📎 **246 decisioni in 95 tornate; la prossima è D247.**

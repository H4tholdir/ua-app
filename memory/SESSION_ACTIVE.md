# Sessione attiva — punto di ripresa

🚪 **PUNTO DI RIPRESA — leggi prima questo:**
`docs/roadmap/2026-08-06-intervento-sera-handoff.md` — **la §0 per prima**.

**Stato (06/08/2026, 22:14):** ramo **`intervento-post-consegna`**, **NON pubblicato**, albero pulito.
`main` intatto e uguale a `origin/main` (`7427a680`). Il conteggio dei salvataggi **non si ricopia**:
`git rev-list --count main..HEAD`. `provato:` `npm run verify:full` **uscita 0 letta da variabile**:
tsc **0** · eslint **0** · build ok · **sei guardie verdi** · vitest **5168 passate | 56 saltate**
(437 file). 📈 Era **5069 | 19** su 429 stamattina.

**§0 in quattro righe:**
1. 🔴 **Il compito «l'evento si ritira» (D273) non ha ancora un numero nel piano**, e il `REVOKE DELETE`
   su `eventi_qualita` **non è stato messo apposta**: da solo terrebbe nei conteggi ogni riga nata da un
   tocco sbagliato. Una **sentinella** nei test lo dichiara e **si capovolgerà** quando il ritiro arriva.
2. 🔴 **Tre testi aspettano il cancello §0B** (domanda sulla gravità, conferma in uscita, conferma in
   ingresso) — e prima va sciolto il nodo delle **due porte** (`errore_registrazione` vs il ritiro).
3. 🔴 **Il Task 7 non può chiudersi prima di D283**: oggi il tasto parte al primo tocco e la sola rete
   erano i dieci minuti che il 7 rimuove.
4. 🔴🔴 **Quattro prove ROTTE DA PRIMA** in `tests/integration/annulla-effetti-storno-td04.rpc.test.ts`
   (note di credito): in CI non girano mai, quindi nessuno poteva vederle. **Fuori ondata, priorità alta.**

**Oggi:** Task 1-bis (le prove in suite), **Task 2** e **Task 3** fatti e revisionati; migration D274 e
Task 3 **applicate al database**. **Dodici decisioni, D273-D284**, in cinque tornate (110-115).
Il panel ha **rifatto** la proposta invece di approvarla; il controllo pre-volo ha trovato il piano che
contraddiceva la spec; e la revisione ha trovato che l'app chiedeva **meno** del dovuto su un incidente
potenzialmente grave. **Tre compiti su nove.**

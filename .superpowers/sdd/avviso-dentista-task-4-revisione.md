# Revisione dei Task 4 e 4-bis — «L'avviso al dentista»

**Quando:** 09/08/2026, pomeriggio. **Chi:** l'orchestratore, sul codice e sul catalogo vivi.
**Esito:** ✅ **entrambi si chiudono.** Nessuna affermazione dei due resoconti è stata smentita.
🔑 **E il Task 4-bis ha PROVATO che una precauzione del panel era una necessità, non una preferenza.**

## 1. Verificato da me

| cosa | esito |
|---|---|
| Albero, `main` | pulito · `main` intatta a `7427a680` |
| Le guardie della rotta | `isSameOrigin` (prima riga) · `getFreshLabContext` · `assertLabOperativo` · il filtro `lavoro_id` **che il piano non chiedeva** · `STATI_APERTI` **derivato** da `chiudeIlPromemoria()`, non riscritto ✅ |
| L'allowlist di D342 | `RUOLI_CHIUSURA_AVVISO = ['titolare','tecnico','front_desk'] as const`, **esportata** (`route.ts:192`) ✅ |
| Prove | `npx vitest run tests/unit/api-avviso.test.ts` → **31 passate su 31** ✅ |
| I cinque ruoli sono cinque | `provato:` `utenti_ruolo_check` → `titolare, tecnico, front_desk, admin_rete, admin_sistema` ✅ |

**Riferito, non verificato da me:** `verify:full` a `5793 | 119` su 463 file con `VERIFY_EXIT=0`. Ho
misurato il pezzo nuovo (31 su 31) e i cinque ruoli sul catalogo. **Le saltate restano 119**, che è la
cosa che conta: queste prove sono unitarie e la verifica locale le esegue.

## 2. 🔑 La precauzione del panel era una NECESSITÀ, e adesso è misurata

Il panel di sicurezza aveva chiesto di escludere `admin_sistema` **per nome** e non lasciandolo cadere sul
403 del «laboratorio nullo», con questo argomento: `lab-context.ts:16` dice che *laboratorio nullo ⟹
`admin_sistema`*, **non il converso**. Era un ragionamento, non una misura.

**L'esecutore l'ha misurato.** `provato:` il vincolo vivo —

```
utenti_lab_required_for_non_admin
  CHECK (((ruolo = 'admin_sistema'::text) OR (laboratorio_id IS NOT NULL)))
```

**È un'implicazione in una direzione sola: un `admin_sistema` CON un laboratorio è legale**, e infatti
`UPDATE utenti SET laboratorio_id = <lab vero> WHERE ruolo='admin_sistema'` **è stato accettato** (in
transazione annullata). ➡️ **Senza il cancello per nome, il personale UÀ con un laboratorio assegnato
potrebbe chiudere l'adempimento di un cliente.** Il cancello non è prudenza: chiude un caso raggiungibile.

## 3. La prova che doveva arrossire è arrossita — e questo valida il metodo

Il Task 4 aveva scritto una prova che **fissava il comportamento di allora** (nessun cancello di ruolo)
*perché una decisione futura la facesse fallire*. La decisione è arrivata dopo tre ore, e la prova ha
fallito con il messaggio giusto:

```
AssertionError: ruolo admin_rete: expected 403 to be 200
```

🔑 **Non è un dettaglio di processo: è la differenza fra una prova che documenta e una prova che
sorveglia.** La prova nominava i quattro ruoli **uno per uno**, quindi il restringimento non poteva
passare inosservato — se avesse controllato «una qualunque chiamata riesce», sarebbe rimasta verde.

## 4. Due cose che il conteggio di R-P4 ha cambiato, non confermato

L'esecutore riporta `4 su 6 · 1 su 6 · 3 su 6 · 2 su 6`, e il conteggio **ha modificato il codice due
volte**:
- **un abbozzo scritto come blocklist superava 5 prove su 6** → è nata la prova che distingue una
  allowlist da una blocklist (senza di quella, il divieto di `CLAUDE.md` §9 non era sorvegliato);
- **una prova era tautologica** — ciclava sulla costante che stava provando → riscritta con i tre nomi a
  mano.
🔑 **Ed entrambe sono la stessa lezione: una prova che deriva tutto da ciò che prova non prova niente.**
📌 L'esecutore ha anche corretto **un numero proprio** nel resoconto: aveva scritto `2 su 6` misurato
*prima* di rinforzare una prova, cioè un numero sopravvissuto alla cosa che misurava.

## 5. 🔴 Il ritrovamento fuori mandato che conta più del task

**`supabase/schema.sql:247` porta un `CHECK` con QUATTRO ruoli**, `provato:` letto da me:

```
  ruolo TEXT NOT NULL DEFAULT 'tecnico'
        CHECK (ruolo IN ('titolare','tecnico','front_desk','admin_rete')),
```

Il database vivo ne ha **cinque**. ➡️ **Chi costruisce un cancello di permessi leggendo quel file ne
dimentica uno — ed è ESATTAMENTE come `admin_sistema` è stato dimenticato per mesi**, pur essendo usato
15 volte nel codice (`CLAUDE.md` §9). 🛑 **E una ricostruzione dello schema da quel file renderebbe
illegale ogni utente `admin_sistema` esistente.** Riga **46** della coda.

📌 Gli altri: `striscia.ts` dà a `admin_rete` fiscali e pagamenti come al titolare, **in due punti** — è
l'incoerenza che il panel aveva segnalato, e ora **contraddice D342** (riga **47**) · non esiste un
elenco unico dei cinque ruoli in `src/` (`RuoloInvito` ne ha **quattro**) · `RUOLI_PEC_SETUP` è
duplicato in due rotte.

## 6. Che cosa passa al Task 5 e al cancello del disegno

1. 🛑 **Il pavimento delle migration è invariato: `20260809133546`** — nessuno dei due task ne ha scritte.
2. 🎨 **Adesso viene il CANCELLO §0B:** mockup delle due superfici (il foglio nell'app e la sezione nel
   portale), chiaro e scuro, 390 · 768 · 1280, **più varianti mai una sola**, e **l'approvazione
   esplicita di Francesco** prima di scrivere React.
3. ⚠️ **La scadenza del gettone del portale va risolta nel Task 5**, e l'esecutore del Task 4 ha corretto
   una mia formulazione comoda: **rifiutare la registrazione non richiama indietro il messaggio già
   partito, cancella solo la prova di averlo mandato.** Il posto giusto è dove il testo si **compone**,
   perché lì un gettone scaduto si può **rigenerare**.
4. 🟠 **Un promemoria sopravvive al cestinamento del lavoro** (`deleted_at` non fa scattare la cascata):
   il Task 6 potrebbe mostrare un promemoria per un lavoro buttato.
5. 🟠 **`assertLabOperativo` blocca questa mutazione per un laboratorio `sospeso`/`scaduto`:** *uno stato
   di abbonamento impedisce di registrare un adempimento di legge.* Vale per ogni mutazione del progetto,
   quindi non è stato aggirato — **ma è una domanda vera**, e va posta fuori da questa ondata.

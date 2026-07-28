# Sessione attiva — ONDATA (a) IN PRODUZIONE. Si parte con la (b): le schermate (28/07/2026)

🛑 **PUNTO DI RIPRESA: `docs/roadmap/2026-07-28-ondata-b-handoff.md`** — leggi quello, non questo
file, per sapere cosa fare. Qui c'è solo lo stato.

🚀 **Ondata (a) MERGIATA E PUBBLICATA:** merge `a3e52379` su `main`, **78 commit**, fast-forward
pulito (zero conflitti, `main` non si era mosso). `tsc` 0 e **vitest 3625** rieseguiti **su `main`
dopo il merge**, non solo sul ramo.
**Denti e colore ora sono righe vere in `lavori_denti`**, non più testo dentro il lavoro.

✅ **FASE 9 superata: 5 prove su 5** nell'app vera, ognuna verificata **anche** in banca dati, più
**5-bis**, il controllo positivo che il controllo di conflitto **scatta** (409 con data vecchia, e
nulla scritto) — la prova 5 da sola mostrava solo che **non** scatta a sproposito.
✅ **Il collaudo ha trovato e chiuso un difetto suo:** le tre frasi dell'ondata **non arrivavano
all'utente** («⚠ Errore — riprova» al loro posto). La condizione che le mostrava era
**irraggiungibile**: quel paragrafo era codice morto. Corretto con TDD + prova per mutazione, e
riprovato nel browser ai **sei tagli**.

🛑 **L'ONDATA (b) NON COMINCIA DAL CODICE.** È tutta interfaccia: mockup da far approvare a Francesco
**prima** (§0B), poi il piano, poi il codice, poi il **gate estetico L2** (FASE 9b).
🔑 **Il catalogo dei colori non chiuso vuole il PANEL:** l'esito giusto è **asimmetrico** — sul PUT
rifiutare non perde nulla, sul POST perderebbe **il lavoro**.

⚠️ **Cinque cose sul tavolo della (b):** due **introdotte** dalla correzione del 28/07 (l'avviso
copre in parte due campi colore · **contrasto 4,06 chiaro / 3,76 scuro** contro 4,5 richiesti — il
colore viene dai token) · due **preesistenti** (idratazione disallineata su
`LinguettaCassette`/`StanzePager` · la fascia sticky che a 1280 copre due campi finché non si scorre)
· una **di lingua** (il messaggio del server dice cos'è rotto, non cosa fare).

🔑 **Baseline del database, da lasciare così dopo ogni prova: 294 lavori · 0 righe in `lavori_denti`
· 916 pazienti · 48 colori.**
🔑 Collaudo nel browser: `preview_start {name: "ua-dev"}` + utente **sintetico**
`e2e-titolare@ua-test.local` (credenziale versionata nel repo, non di una persona) — **si dichiara**.
🛑 **MAI worktree.** ⚠️ `.next` stantio dopo un cambio di ramo → `/usr/bin/trash .next`.

# Mandato — Task 4-ter: la firma dei messaggi è il NOME DEL LABORATORIO (⚖️ D345)

**Data:** 09/08/2026, 19:17. **Ramo:** `intervento-post-consegna` (attivo, pubblicato).
**Verbale:** `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`, **centoquarantanovesima
tornata**. **Piano:** `docs/superpowers/plans/2026-08-09-avviso-al-dentista.md`, sezione **Task 4-ter**.

## La decisione

> Francesco: «*ricorda che ogni messaggio che inviamo non deve essere firmato da UA lab, ma dal nome del
> laboratorio*»

🔑 **Vale per OGNI messaggio che l'app propone**, non solo per l'avviso al dentista.

## 🔴 Il fatto che rende questo compito diverso da una correzione di testo

`provato:` `grep -rn "UÀ Lab" src/` → **TRE punti**, e **DUE sono in produzione**:

```
src/lib/avvisi/messaggio.ts:62          const MITTENTE = '— UÀ Lab'
src/lib/consegna/whatsapp-template.ts:18      `— UÀ Lab`,
src/lib/consegna/whatsapp-template.ts:30      `— UÀ Lab`,
```

`provato:` i chiamanti di `whatsapp-template` sono **quattro componenti veri**, fra cui i **solleciti di
pagamento**: `ScadenzarioList.tsx:7` · `EstrattoContoView.tsx:9` · `TabAccettazione.tsx:8` ·
`FrameConsegnato.tsx:29`.
➡️ **Oggi ogni sollecito di pagamento mandato a un dentista si firma col nome dello STRUMENTO invece che
del mittente.** Non è un difetto estetico: è un messaggio che esce dal laboratorio e non dice chi è.

## Il perimetro

**Tutti e tre i punti**, più i chiamanti che devono passare il nome. 🛑 **Ma l'elenco dei file NON lo
decide questo brief: lo decide il tuo censimento** (R-P2/R-P6). Comincia da `grep -rn "UÀ Lab" src/` e da
`grep -rn "whatsapp-template" src/`, e **scrivi l'elenco vero nel resoconto**.

⚠️ **Tocca superfici in PRODUZIONE** (scadenzario, accettazione, consegna) → **FASE 3 obbligatoria**
(tutte e cinque le caselle, compreso «come si annulla»), percorso **Medio**.
🛑 **NIENTE interfaccia nuova, niente migration.** Se ti sembra di aver bisogno di una migration,
**fermati e riferisci**.

## 🔴 I punti dove si può sbagliare

### ① QUALE campo è «il nome del laboratorio»? Ce ne sono DUE

`provato:` sul catalogo, `public.laboratori` ha **`nome`** e **`ragione_sociale`** (più `prrc_nome`, che
è un'altra cosa: la persona responsabile).
➡️ **Scegli e motiva.** Elementi che ho misurato e che ti passo: il **portale** mostra `laboratori.nome`
come intestazione (`portale/[token]/page.tsx:428`), mentre `ragione_sociale` compare **solo sul foglio
stampato** della zona economica (`FatturazioneSection.tsx:849`). 🔑 Un messaggio a un dentista è una
comunicazione **commerciale**, non un documento fiscale — ma **la scelta è tua e va scritta**.

### ② DA DOVE arriva il nome, in ognuno dei quattro punti di partenza?

È la parte vera del lavoro. Per ogni chiamante: **il nome del laboratorio è già in mano a chi compone il
messaggio, o va caricato?** Se in qualche punto **non c'è**, riferisci come pensi di portarlo lì —
🛑 **e NON inventare un secondo modo di leggerlo**: se esiste già un contesto che porta i dati del
laboratorio, si usa quello.
⚠️ **Un ripiego silenzioso è vietato:** se il nome mancasse a runtime, un messaggio firmato `— undefined`
o `—` è peggio di quello sbagliato di oggi. **Decidi cosa succede e provalo.**

### ③ LA FIRMA È UN DATO, NON UNA COSTANTE — e la firma della funzione cambia

`buildAvvisoMessage({ numeroLavoro, portalToken })` diventa una funzione che riceve **anche** il nome.
Stessa cosa per le funzioni di `whatsapp-template.ts`. 🛑 **`tsc` è il tuo alleato qui:** dopo il
cambiamento **ogni** chiamante deve rompersi, e i chiamanti rotti sono l'elenco vero dei file da toccare.
📌 Se `tsc` **non** si rompe da qualche parte, quel punto passa un valore per posizione o per ripiego:
**guardalo, è sospetto.**

### ④ LE PROVE ESISTENTI VANNO GUARDATE, NON SOLO AGGIUSTATE

`tests/unit/avviso-messaggio.test.ts` (14 prove, del Task 3) contiene con ogni probabilità
un'asserzione sulla firma vecchia. 🔑 **Se una prova diventa rossa, è il comportamento giusto** — e se
**nessuna** prova si accende cambiando la firma, allora la firma non era sorvegliata da nessuno:
**riferiscilo**, perché è un'informazione sul valore di quelle prove.
- [ ] Una prova nuova deve fissare che **il nome del laboratorio compare nel messaggio** e che
      **«UÀ Lab» NON compare più in nessun messaggio prodotto**.

### ⑤ ⚠️ IL PERIMETRO DI D345 È «OGNI MESSAGGIO», NON «OGNI TESTO»

Non toccare l'intestazione del portale, i PDF, le etichette dell'interfaccia. **Messaggio = ciò che esce
dall'app verso una persona** (WhatsApp, e ogni canale simile). Se trovi un caso di confine,
**scrivi come l'hai deciso**.

## Le regole di casa

- Skill `superpowers:test-driven-development`: la prova prima. **R-P4:** dopo il primo rosso, abbozzo
  inerte e **conta le asserzioni che si accendono** (`N su M`).
- **FASE 7:** `npm run verify:full; ESITO=$?; echo "VERIFY_EXIT=$ESITO"` — da variabile, **mai dietro una
  pipe**, timeout 600000 ms. 📌 Base dopo il Task 4-bis: **`5793 passate | 119 saltate` su 463 file** —
  **rimisurala**. Le tue prove sono unitarie: le passate salgono, **le saltate no**.
- ⚖️ **D318 — `git add <percorsi>`, MAI `-A`**, e `git status` prima di salvare. Messaggi lunghi con `-F`.
- 🛑 Niente `push`, niente `main`, niente worktree, niente `rm -rf` fuori da `scripts/tmp/`.
- **R-E2:** un difetto fuori mandato si **riferisce**, non si corregge.

## Il resoconto

In `.superpowers/sdd/avviso-dentista-task-4ter-report.md`: ① l'elenco vero dei file toccati, dal tuo
censimento · ② quale campo hai scelto per il nome, e perché · ③ da dove arriva il nome in ognuno dei punti
di partenza, e cosa succede se manca · ④ se una prova esistente è arrossita (e se no, che cosa significa)
· ⑤ `N su M` · ⑥ i numeri (`VERIFY_EXIT`, passate/saltate prima e dopo) · ⑦ `non provato` col motivo ·
⑧ ritrovamenti fuori mandato · ⑨ il salvataggio.

🛑 **Non ricopiare nessun numero da questo brief senza rifare il conto.**

# BRIEF — Task C-quater: i tre critici del Task C

**Uno è nel codice che andrà in produzione. Due sono nelle reti di sicurezza — dove il codice è giusto e
sono le prove a non poter diventare rosse.**

**Giudizio da cui nasce:** `.superpowers/sdd/atto-unico-task-c-review.md` — **leggilo per intero prima di
toccare qualsiasi cosa**: porta le prove incollate e le mutazioni già eseguite.
**Ramo:** `intervento-post-consegna` (in checkout, albero pulito). 🛑 **MAI un git worktree.**
**Base:** `14ead848`. **Task A · B · C-bis · C-ter · C sono COMPLETI**: tu **correggi**, non rifai.

📌 **NESSUNA MIGRATION.** Il contratto SQL è fermo — tre migration, tre revisioni. Se ti sembra di doverlo
toccare, **ti fermi e riferisci**.

---

## 🔴 C3 — LA REGOLA SUL VUOTO SI FERMA AL PRIMO LIVELLO (codice vivo)

`src/lib/dichiarazione/correzioni.ts:131-139`.

`prescrizione_caratteristiche: {colore: ''}` **passa** la validazione. Misurato dalla revisione:
`"Elementi: denti 26, 27 · Colore: A3"` diventa `"Elementi: dente 26"`, e con la sola caratteristica
**la voce 6 dell'Allegato XIII sparisce dal documento** — il tutto con un **200 «rifatta»**.
E la penna scrive `""` sulla riga vera: il suo corpo vivo valida **il nome del campo e mai il valore**.

🔑 **È la stessa famiglia D242, un livello sotto dove era stata cercata:** un vuoto che vince su un dato
buono e lo cancella da un documento di legge, dicendo che è andato tutto bene.

🛑 **Chiudilo con la STESSA regola già scritta, estesa in profondità — non con un caso speciale per la
prescrizione.** La regola di C2 esiste già in quel file: il difetto è che guarda solo il primo livello.

---

## 🔴 C1 — LA PORTA DEL TENANT SUL PAZIENTE NON HA UNA PROVA CHE POSSA FALLIRE

Mutazione della revisione: **cancellato `.eq('laboratorio_id', …)` sulla lettura del paziente → nessun
rosso, 130 prove su 130 ancora verdi.** Causa: il finto di `pazienti` **inghiotte i `.eq()`**.

🔑 **È esattamente la debolezza che l'esecutore del Task C ha già chiuso su `dichiarazioni_conformita`
(la catena che annota i filtri) e non ha portato fin qui.** ➡️ **Portacela.** La prova deve **asserire le
colonne filtrate**, non l'ordine delle chiamate.

⚠️ **Perché è un critico anche se il codice è giusto:** la porta del tenant è ciò che impedisce a un
documento di legge di nominare **il paziente di un altro laboratorio**. Una guardia senza una prova che
possa fallire è una guardia che il prossimo refactor spegne in silenzio.

---

## 🔴 C2 — IL FAIL-CLOSED SULL'ESITO IGNOTO NON È PROVATO

La prova passa **dalla metà sbagliata della condizione**: la finta non porta `nuova_id`, quindi il test è
verde per il motivo sbagliato. **Dimostrato dalla revisione:** aggiungendo `nuova_id`, la promessa
«*resolved `{ stato: 'ok' }` instead of rejecting*» — cioè **un esito sconosciuto passerebbe per
successo**.

🛑 È il difetto peggiore possibile su questo documento: **dichiarare «rifatta» quando non è successo
niente**. Il codice è giusto (l'idioma è `generate-ddc.ts:477-487`); **è la prova a non provarlo**.
➡️ La prova deve fallire **sull'esito ignoto**, non sulla mancanza di un campo.

---

## 📋 COME LAVORARE

- [ ] **Passo 1 — riproduci le tre mutazioni** descritte nel giudizio, **prima** di correggere: due
  restano verdi (C1, C2), una si accende. Incolla gli output: è il tuo rosso.
- [ ] **Passo 2 — correggi**, nell'ordine C3 → C1 → C2.
- [ ] **Passo 3 — rifai le mutazioni**, e adesso **tutte e tre devono diventare rosse**. Incolla.
  🛑 **Poi RIMETTI il codice com'era** e verifica con `git diff` che non resti niente della mutazione.
- [ ] **Passo 4 — FASE 7 piena:** `npm run verify:full; ESITO=$?; echo "VERIFY_EXIT=$ESITO"` —
  timeout ≥ 400000 ms, uscita **da variabile**. Base di partenza: **`5606 | 68 su 454`**.
  📌 Il numero **deve salire**: stai aggiungendo prove.
- [ ] **Passo 5 — salva.** ⚖️ **D318: `git add <percorsi>` coi tuoi file, MAI `git add -A`.**
  ⚠️ Se usi `-m`, attento ai **backtick**: la shell li esegue e ti mangia la parola — usa `-F <file>`.
- [ ] **Passo 6 — BP-1** (§0A): memoria e roadmap. ⚠️ In MEMORY.md «voce N» è **riservata** alle sezioni
  della memoria: per la roadmap si scrive «la riga N della coda».

## 🛑 IL METODO, ED È IL PUNTO DI QUESTO COMPITO

**Una prova che resta verde col codice rotto non è una prova.** Non ti basta scrivere asserzioni nuove:
devi **dimostrare che diventano rosse** rompendo apposta il codice, e incollare la prova.
🔑 Oggi questa ondata ha incontrato **quattro volte** la stessa famiglia — un controllo sugli orari che
non poteva mai accendersi, un attrezzo che entra come proprietario, una fixture che sceglieva l'anno che
nascondeva il difetto, un finto che rispondeva per ordine di chiamata. **Tu stai chiudendo la quarta.**

## 🛑 R-E2 e il resto

- Un difetto fuori mandato si **riferisce**, non si corregge. Già noti: `riemetti_ddc_atomica` accetta
  ancora tutto (roadmap, riga 26) · `numero_prescrizione` (**decisione di Francesco già presa: si
  sistema la radice, ed è un compito a sé — NON toccarlo qui**) · `{anno_ddc: null}` supera il controllo
  di presenza.
- **Cerca dove questo brief sbaglia.** Oggi: il Task B ha trovato cinque difetti nel proprio (due
  dell'orchestratore), il C-bis tre, il C-ter tre, il Task C due — e le revisioni ne hanno trovati
  **quattro** dell'orchestratore nel piano, righe marcate «provato» che erano **false**.
- **Resoconto** in `.superpowers/sdd/atto-unico-task-c-quater-report.md`, con gli output incollati delle
  mutazioni **prima e dopo**, e **cosa NON hai fatto**.

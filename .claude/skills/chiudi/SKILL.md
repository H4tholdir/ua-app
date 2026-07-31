---
name: chiudi
description: Procedura di CHIUSURA SESSIONE del progetto UÀ. Usare quando Francesco scrive /chiudi, «chiudiamo la sessione», «prepariamo tutto per una sessione nuova» o simili. Mette al sicuro il lavoro, verifica lo stato reale, scrive l'handoff, allinea memoria e roadmap, salva — e CONSEGNA A FRANCESCO IL MESSAGGIO DI APERTURA da incollare nella sessione nuova.
---

# Chiusura sessione — UÀ

**Cosa la fa scattare:** `/chiudi`, oppure Francesco che chiede di chiudere / preparare il passaggio a una
sessione nuova con contesto pulito.

🔑 **La ragione per cui questa procedura esiste, in una riga:** la sessione nuova parte **cieca**, e vede solo
ciò che è **scritto** — non ciò che è stato capito. Tutto quello che resta in chat è perso.

🛑 **La consegna finale NON è «ho aggiornato la memoria»: è il MESSAGGIO DI APERTURA**, pronto da incollare,
in un blocco di testo copiabile. Se manca quello, la chiusura non è avvenuta. *(Nato il 02/08/2026: una
chiusura fatta bene in tutto il resto, e il messaggio non era stato dato.)*

---

## I sette passi, in quest'ordine

### 1. Prima metti al sicuro, poi guarda
Se c'è lavoro non salvato, **salvalo o dichiaralo**. Un handoff scritto su un albero sporco descrive uno stato
che non esiste.
```bash
git status --short
```

### 2. Guarda lo stato VERO, non quello ricordato
Mai fidarsi della memoria di sessione per dire dove siamo. Si misura:
```bash
git log --oneline -3 && git log --oneline origin/main..main | wc -l
npx tsc --noEmit && npx vitest run && npx next build
```
🛑 **I tre comandi sono tre e nessuno sostituisce l'altro** (`tsc` non vede la firma degli handler di rotta).
Il numero delle prove **si incolla**, non si stima: diventa il riferimento della sessione nuova.

### 3. Fai il censimento di ciò che resta aperto — e cercalo, non ricordalo
Per ogni cosa che il piano/le decisioni chiedevano, verifica **col codice** se è stata fatta.
🔴 **Il caso che questa riga esiste per prendere:** una decisione **rimandata a un gate** («si decide insieme,
al gate estetico») e poi **mai portata a Francesco**. Il gate risulta fatto, la decisione manca, e nessun
documento se ne accorge. Rileggi i «da decidere» e i «si decide insieme» dell'ondata e **controllali uno per
uno con un grep**.

### 4. Scrivi l'handoff — `docs/roadmap/YYYY-MM-DD-<tema>-handoff.md`
Ordine obbligato, ed è quello che serve a chi legge da fermo:

| § | contenuto |
|---|---|
| **§0** | 🔴 **Ciò che NON è stato fatto e andava fatto** — per primo, anche (soprattutto) se è colpa di chi scrive. Con il fatto tecnico e il `provato:` che lo dimostra |
| **§1** | Che cosa è successo, in una **tabella** — non in prosa |
| **§2** | 🔑 **Le lezioni**: ciò che si è imparato e vale per il **codice futuro**, non solo per questa ondata |
| **§3** | Che cosa **resta aperto**, in ordine di importanza, con `file:riga` |
| **§4** | **Da dove ripartire** secondo la roadmap, con le voci vere |
| **§5** | Il minimo per non sbagliare: comandi, trappole pagate, come entrare nel banco di prova |

**Regole di scrittura:** ogni affermazione porta la sua prova (`provato:`, `file:riga`, o «**non verificato**»).
Un numero senza misura non si scrive. Le trappole già pagate si nominano, o si ripagano.

### 5. Allinea i documenti vivi — BP-1
- `memory/SESSION_ACTIVE.md` → **riscritto**, non appeso: punta all'handoff e mette in testa la sua §0.
- `memory/MEMORY.md` → riga di stato aggiornata, col puntatore all'handoff.
- `docs/roadmap/ROADMAP-UFFICIALE.md` → se una voce è cambiata di stato.
- Il **verbale delle decisioni** → se ne sono state prese in chat e non hanno ancora il numero (§0A-bis: il
  numero si dà **subito**, e il conteggio in testa si muove con la riga).
```bash
node scripts/guardia-coerenza-documenti.mjs
```

### 6. Salva e pubblica
🛑 Mai `git add -A`. Messaggio **fuori dal repo**, percorsi espliciti.
⚠️ `git commit -- <percorso>` committa il contenuto **del disco** per quel percorso.
Il push si fa **se Francesco l'ha autorizzato**; altrimenti si dichiara che il commit c'è e il push no.

### 7. 🎁 CONSEGNA IL MESSAGGIO DI APERTURA
In un **blocco di testo copiabile**, pronto da incollare nella sessione nuova. Deve contenere, in poche righe:

1. il **percorso dell'handoff**, come prima cosa da leggere;
2. la **§0** in una frase — ciò che manca, così non si perde nemmeno se l'handoff viene letto di fretta;
3. lo **stato del ramo** (`main`/branch, commit, in produzione o no);
4. il **riferimento misurato** (prove, `tsc`, build) perché la sessione nuova sappia da che numeri parte;
5. la **prima cosa da fare**.

Poi, in chat, il riepilogo **a voce** secondo `../CLAUDE.md` §7 — racconto, non elenco di sigle.

---

## Le tre cose che NON si fanno mai in chiusura

1. **Non si scrive un handoff su misure ricordate.** Se non l'hai eseguito in questa sessione, o lo esegui o
   scrivi «non verificato».
2. **Non si nasconde un buco proprio.** Va in §0, per primo. Un handoff che racconta solo i successi manda la
   sessione nuova a sbattere esattamente dove è andata a sbattere questa.
3. **Non si chiude senza il messaggio di apertura.** È la consegna, non un di più.

# Panel advisor — parole di categoria del nome studio (26/07/2026)

**Convocato su richiesta esplicita di Francesco** («fai un po di ricerche su internet e poi
fatti aiutare da advisor specializzati»). Tre prospettive indipendenti, briefate separatamente:
**UX** (chi legge l'etichetta) · **architettura** (chi mantiene il codice) · **dati** (chi
custodisce l'anagrafica). Base comune: `2026-07-26-parole-categoria-ricerca.md` (1.604 nomi
reali) e `2026-07-26-nomi-lunghi-variante6.md`.
🛑 **NON ratificato: in attesa della decisione di Francesco sul punto in disaccordo.**

## Su cosa i tre sono D'ACCORDO

1. **La lista di parole regge** e sta nel posto giusto (funzione pura, nessuna dipendenza).
2. **`dental` resta FUORI.** Stesso controesempio dai tre: `Dental Center s.r.l. uninominale`
   diventerebbe «s.r.l. uninominale», e altrove spaccherebbe 23 marchi (`DENTAL DUE`, `DENTAL
   TIME`…). UX aggiunge il criterio da scrivere in codice: *una parola entra in lista solo se è
   un nome comune di categoria in italiano e MAI la prima metà di un marchio.*
3. **La guardia va cambiata di NATURA, non di taratura.** Oggi conta le lettere di tutto il
   residuo, quindi «SRL UNIPERSONALE» (16 lettere) passa. Deve guardare la **prima parola**.
4. **`studio_nome` non si tocca** (vincolo fiscale, v. sotto).
5. **Un campo «nome breve» sull'anagrafica è la risposta di lungo periodo**, ma DOPO la guardia.

## Il punto in DISACCORDO — via A o via B

Quando quel che resta comincia con una sigla societaria o un separatore:

| | proposta | esito su `AMBULATORIO ODONTOIATRICO - CLINICA DEL SORRISO` |
|---|---|---|
| **Via A** (dati + architettura) | si **rinuncia** ad accorciare | nome intero, come oggi |
| **Via B, versione ricerca** | si salta e si **riprende** a togliere | ❌ «DEL SORRISO» — `CLINICA` è in lista e viene tolta anche lei: si ampute il marchio |
| **Via B, versione UX** | separatore → si butta e ci si **FERMA** | ✅ «CLINICA DEL SORRISO» |

**Argomenti:**
- *Dati*: la B non era misurata → **obiezione ora superata**, v. misura sotto.
- *Architettura*: la A può solo trasformare «accorciato» in «intero», quindi non può produrre
  nessuna etichetta che oggi non esista già — è l'unica correzione impossibile da sbagliare.
  La B apre il concetto «salto un pezzo e vado avanti», che indebolisce la regola
  «solo dalla testa, solo di seguito» — l'unica cosa che salva `Studio Dentistico Del Corso`.
- *UX*: la B mette il cognome in prima posizione, che è ciò che l'odontotecnico cerca.

**MISURA del controller** (`scripts/tmp/via-a-vs-b.mjs`, browser reale, DPR 3) — gli esiti della
via B **ci stanno** a tutte le larghezze provate:

| nome | esito via B | entra a |
|---|---|---|
| `CENTRO DENTALE S.A.S. DI GIUSEPPE SANNINO & C.` | «DI GIUSEPPE SANNINO & C.» | 9px @360 · 9,5 @375 · 10 @390 |
| `AMBULATORIO ODONTOIATRICO - CLINICA DEL SORRISO` | «CLINICA DEL SORRISO» | 10px ovunque |
| `STUDIO ODONTOIATRICO SRL UNIPERSONALE` | «UNIPERSONALE» | 10px ovunque (ma non identifica nessuno) |
| `STUDIO ODONTOIATRICO STP S.R.L.` | — | la B non produce nulla di utile |

## ⚠️ TRAPPOLA nel documento di ricerca — da NON ratificare alla lettera

La ricerca descrive la correzione in due punti con parole diverse. Il §5.1 è giusto; **il §3.5 è
sbagliato**: dice «le 4 lettere contate sulla prima parola». Preso alla lettera **uccide due
esiti che Francesco ha già approvato**:

| nome | resta | prima parola | con il §3.5 |
|---|---|---|---|
| `STUDI MEDICI DI SANTI GIUSEPPE` | `DI SANTI GIUSEPPE` | `DI` = 2 lettere | ❌ non si accorcerebbe più |
| `POLIAMBULATORIO ODONTOIATRICO SAN RAFFAELE` | `SAN RAFFAELE` | `SAN` = 3 lettere | ❌ non si accorcerebbe più |

In italiano «San», «Santa», «Di», «Del», «De» sono fra le teste di nome più comuni. La soglia
delle 4 lettere **resta sul residuo intero**; il controllo sulla prima parola si **aggiunge**
come guardia indipendente, e chiede solo: almeno una lettera, e non una forma societaria.

## Vincolo fiscale — VERIFICATO dal controller, non riferito

`studio_nome` **è** la denominazione del cliente in fattura elettronica
(`src/lib/fattura/generate-xml.ts:262`), poi congelata sulla fattura emessa. Compare anche nel
contratto privacy e nella ricevuta di consegna (che si dichiara «DdC — MDR 2017/745 Allegato
XIII»). **Correzione a una premessa data dal controller:** sulla Dichiarazione di Conformità il
prescrittore NON è `studio_nome`, è la persona (`src/lib/pdf/generate-ddc.ts:89`,
`richiedente_nome`). Ma il legame indiretto esiste: i «colleghi di studio» si trovano con
un confronto **esatto** su `studio_nome` (`src/app/api/clienti/[id]/studio-members/route.ts:50`)
e alimentano proprio il prescrittore. → **Qualunque «pulizia» di `studio_nome` è scartata.**

## Difetto SECONDARIO trovato dall'architettura — verificato

`src/components/ds/Cassetta.tsx:392-396`: la bandierina `fontRimisurati` viene alzata **dentro**
la promessa invece che al momento della registrazione. Mentre la scala scende, la stessa promessa
viene prenotata più volte → **la discesa dei gradini può girare due volte, e la seconda dopo il
primo disegno**: aprendo la parete si può vedere un nome cambiare grandezza un istante dopo.
Fix: una riga (alzare la bandierina alla registrazione). Non è nel perimetro della guardia.

## Copertura reale — misura dei dati

Sui 39 nomi veri: la regola ne accorcia **5**; i nomi davvero lunghi sono **8**, e di quegli 8
la regola ne aiuta **3** (`SCIENGA FRANCO`, `PIEGARI GIANFRANCO`, `SICA FRANCESCO` — tre cassette
oggi indistinguibili). Gli altri **5** non sono salvabili da nessuna lista: sono fatti di titoli e
abbreviazioni. **Questo è l'argomento vero per il campo «nome breve»:** copre 8 su 8 dove la
regola copre 3 su 8. Paletti su cui i tre concordano: facoltativo · vuoto = comportamento di oggi
· letto SOLO dalla parete, mai in documenti · **mai riempito da solo** (niente backfill: congela
una regola viva dentro un dato morto) · la funzione da autorità diventa **suggerimento**
precompilato che l'utente conferma o corregge.

## Riserve minori a verbale

- Con le due parole nuove proposte (`stomatologico`, `dentista`), `Istituto Stomatologico
  Italiano` si leggerebbe «ITALIANO». Accettabile fra pochi clienti, **da scrivere**.
- I test di oggi **non fallirebbero** se qualcuno aggiungesse `dental`: presidiano elenchi, non
  il criterio. Servono una tabella di casi veri nel repo, una prova sull'invariante e una prova
  che **vieta** le parole pericolose.
- Le due parole nuove vanno in un commit **separato** dalla guardia: la guardia restringe e si
  dimostra, le parole allargano e vanno guardate una per una.
- `targheInCollisione` (`parco-shared.ts:124`) calcola sul nome COMPLETO mentre sulla parete si
  legge l'accorciato. Innocuo oggi; da rivedere se si riapre il disambiguatore.

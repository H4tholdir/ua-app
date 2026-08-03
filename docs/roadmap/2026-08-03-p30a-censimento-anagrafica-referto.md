# P30-a — il censimento dell'anagrafica, prima di chiedere qualsiasi cosa

**Quando:** lunedì **3 agosto 2026**, ore **20:51** (`provato:` `date` → `2026-08-03 20:51:20 CEST`).
**Perché esiste:** P30-a chiede una **ricerca** sull'anagrafica del cliente, che «non è mai stata
progettata: sono le colonne che c'erano» (voce di roadmap, aperta da Francesco il 03/08).
**Metodo:** la stessa forma che su P31 ha cambiato il perimetro — **si misura prima di chiedere**.
Tre misure, e la più importante non era nella domanda.

🛑 **Questo referto NON propone ancora niente.** Misura, e dice quale domanda va posta a Francesco.

---

## 0. 🔴 IL RITROVAMENTO CHE NON ERA NELLA DOMANDA

**Nel 58% dei lavori vivi la Dichiarazione di Conformità stampa come «prescrittore» il nome di
un'AZIENDA, non di un professionista.**

`misurato:` (`scripts/tmp/p30a-esposizione.ts`)

```
clienti con un'INSEGNA nei campi persona : 10 su 39
lavori vivi                              : 295
  la cui DdC ricade su cliente.cognome+nome: 294
  E il cliente è un'INSEGNA, non una persona: 172   → 58% dei lavori vivi
```

**La catena, tutta provata:**

1. `provato:` `src/lib/pdf/generate-ddc.ts:146-147` —
   `prescrittore_nome: lavoro.richiedente_nome ?? \`${lavoro.cliente.cognome} ${lavoro.cliente.nome}\`.trim()`
2. `misurato:` `richiedente_nome` è valorizzato in **1 lavoro su 295**. Negli altri **294** è `NULL`,
   quindi **la DdC ricade sempre sul nome e cognome del cliente**.
3. `misurato:` **10 clienti su 39** hanno un'insegna nei campi pensati per una persona —
   `nome="C.O.M." cognome="s.r.l. uninominale"` · `nome="BARALE" cognome="S.A.S."` ·
   `nome="GDA" cognome="STP S.R.L."` · `nome="Dental" cognome="Center s.r.l. uninominale"` ·
   `nome="TEDESCO S R L" cognome="STUDIO"` · quattro «STUDIO ODONTOIATRICO …» · e
   `nome="AGOSTINO ODONTOIATRA" cognome="GUIDA"` (una persona, ma con la professione dentro il nome).
4. **La norma chiede una persona.** `ANALISI/17:144`, elenco degli **8 elementi obbligatori
   dell'Allegato XIII punto 1**, elemento 5: «**Nome del prescrittore** — dentista che ha effettuato la
   prescrizione». ✅ Fonte utilizzabile a peso pieno: `ANALISI/17` è **esplicitamente esente** dallo
   statuto delle fonti (`../CLAUDE.md` §7), avendo fonte primaria propria.

🔑 **Perché nessuno l'aveva visto:** ogni pezzo, da solo, è corretto. Il campo `nome`/`cognome` esiste ed
è obbligatorio; il ripiego della DdC è scritto e sensato; i dati sono stati importati come li aveva il
laboratorio. **Il difetto nasce dalla GIUNTURA** — è la lezione ② di P31, un'altra volta.

⚠️ **La struttura non offre alternative a chi inserisce.** `clienti.nome` e `clienti.cognome` sono
**`NOT NULL` tutti e due** (`supabase/schema.sql:371-372`) e `studio_nome` è **facoltativo**. Chi carica
uno studio o una S.R.L. **deve** riempire due caselle pensate per una persona: non sta sbagliando, sta
facendo l'unica cosa che il modulo permette.

🛑 **Va detto che cosa NON è provato:** il **contenuto** della DdC non è stato riletto su un PDF
generato in questa sessione — la catena è provata sul codice e sui dati, non su un documento stampato.
E la conseguenza sanzionatoria non è stata valutata: ITCA riguarda la **registrazione**, non il
contenuto (`../CLAUDE.md` §5), quindi **quale sia l'esposizione reale è «non verificato»**.

---

## 1. Quanto è compilata l'anagrafica, davvero

`misurato:` `scripts/tmp/p30a-censimento-anagrafica.ts` — **39 clienti vivi**.

| campo | pieni | lettura |
|---|---|---|
| `codice_sdi` · `pec` | **0/39** · **0/39** | 🔴 **le due chiavi di consegna della fattura elettronica: nessuna delle due, per nessuno** |
| `partita_iva` | **15/39** | 24 clienti su 39 non ce l'hanno |
| `codice_fiscale` | 8/39 | |
| `email` · `iban` · `modalita_pagamento` · `tecnico_default_id` · `cellulare_whatsapp` | **0/39** | mai compilati |
| `telefono` | **1/39** | (già misurato in P31) |
| `listino_numero` · `sconto_percentuale` · `non_soggetto_fe` · `fatturare_al_paziente` · `paese` · `laboratorio_odontotecnico` | 39/39 ma **sempre lo stesso valore** | sono i valori predefiniti: **nessuno li ha mai toccati** |
| `studio_nome` · `nome` · `cognome` | 39/39 | ✅ |
| `indirizzo` · `citta` | 34/39 | |
| `provincia` · `cap` | 30/39 · 23/39 | |

🔑 **Il campo che serve alla fattura è quello che non ha nessuno.** Senza `codice_sdi` né `pec`,
`generate-xml.ts:265` mette **`0000000`** come destinatario: l'Agenzia lo accetta, ma **non lo recapita**
— resta nel cassetto fiscale del cliente.

🛑 **E non c'è nessun controllo che lo impedisca.** `provato:` `validaIdentificativoFiscale` è chiamata
**una sola volta**, sul **laboratorio** (`generate-xml.ts:184`, «Laboratorio (cedente)»). **Non esiste
l'equivalente sul cliente**: né partita IVA, né codice fiscale, né SDI/PEC vengono verificati prima di
emettere. Ricerca fatta su `src/lib/fattura/` e `src/app/api/fatture/`.
⚠️ **«Che cosa la norma pretenda esattamente dal cessionario» NON è stato verificato su fonte primaria
in questa sessione**: qui è provato solo **che cosa fa questo programma**, che è un'altra cosa.

📌 **Il «laboratorio committente» chiesto dalla voce di roadmap: `laboratorio_odontotecnico` è `false`
in tutti e 39.** Il caso **non è mai stato usato una volta**, quindi **dai dati non arriva nessuna
indicazione**: che cosa serva a un laboratorio committente dovrà venire dalla legge o da Francesco, mai
dal comportamento osservato.

---

## 2. La domanda su `pazienti` aveva già una risposta scritta

La voce P30-a dice: «*guardare anche perché `pazienti` tiene nome e cognome in un campo solo e `clienti`
no — nessun documento dice perché*».

🔄 **Un documento c'è, ed è recente.** `provato:` `supabase/migrations/002_fase2_schema.sql:111-134`
**ha già separato** `nome` e `cognome` su `pazienti` (più `sesso`, `comune_nascita`, `partita_iva`,
`asl`, `archiviato`) e ha aggiunto un trigger che ricompone `nome_cognome` da `cognome + nome`. La
regola di scrittura vive in **un posto solo** — `src/lib/domain/nome-paziente-scrittura.ts` — e rimanda
alla spec `docs/superpowers/specs/2026-07-27-nome-cognome-paziente-design.md` §5.

➡️ **Quindi la domanda va riformulata:** non «perché i pazienti hanno un campo solo», ma **«perché la
separazione fatta per i pazienti non è mai stata portata ai clienti»** — che sono quelli che ne hanno
più bisogno, perché un paziente è **sempre** una persona e un cliente **spesso non lo è**.

📌 `misurato:` **917 pazienti vivi**; `nome_cognome` **917/917**, `nome` **2/917**, `cognome` **6/917** —
le colonne nuove sono quasi vuote perché le righe **precedono** la separazione, non perché sia stata
abbandonata. ⚠️ `data_nascita` **0/917** e `codice_fiscale` **0/917**.

---

## 3. Tre anagrafiche, tre regole diverse — e nessun documento dice perché

`provato:` su `supabase/schema.sql`:

| tabella | come si chiama chi c'è dentro | riga |
|---|---|---|
| `fornitori` | **`ragione_sociale TEXT NOT NULL`** — un campo, un'entità | `:545` |
| `laboratori` | **`ragione_sociale`** | `:159` |
| `clienti` | **`studio_nome` facoltativo + `nome` e `cognome` `NOT NULL`** — una **persona** obbligatoria | `:370-372` |
| `pazienti` | **`nome_cognome NOT NULL`** + `nome`/`cognome` aggiunti dopo | `:467` |

🔑 **Il fornitore — che non finisce su nessun documento a valore legale — ha il modello giusto per
un'azienda. Il cliente, che finisce su OGNI fattura e su OGNI DdC, non ce l'ha.**
🛑 **`clienti` non ha nessun campo che dica se è una persona o un'entità:** `provato:` nessun
`tipo_cliente`, `persona_fisica` o `ragione_sociale` nella tabella.

---

## 4. Che cosa va portato a Francesco, e in che ordine

1. 🔴 **Il prescrittore della DdC** (§0) — non è una domanda di anagrafica, è un difetto che tocca un
   documento obbligatorio nel **58%** dei lavori. **Merita una voce di roadmap propria**, e la decisione
   se trattarlo dentro P30-a o separatamente è di Francesco.
2. 🔴 **La forma del cliente:** persona o entità? È la scelta da cui dipendono sia §0 sia la fattura,
   e va fatta **prima** di disegnare qualsiasi schermata.
3. 🟡 **Che cosa TOGLIERE:** sei campi non li ha mai toccati nessuno (`iban`, `modalita_pagamento`,
   `tecnico_default_id`, `sconto_percentuale`, `non_soggetto_fe`, `fatturare_al_paziente`) — ma «mai
   usato su dati di prova» **non è** «inutile», ed è una deduzione che questo referto **non fa**.
4. 🟡 **Che cosa manca per fatturare davvero** (`codice_sdi`/`pec`) — e se il programma debba
   **impedire** l'emissione quando mancano.

🛑 **Vincoli dichiarati:** stasera **nessuna migration** — P33 le blocca fino al **04/08 alle 12:00**.
E il panel di §0C (mandati su misura, **D189**) va convocato **prima della ratifica**, con le lenti
dichiarate: **la legge** · **chi digita al banco** · **il laboratorio committente**.

📎 **Script riusabili:** `scripts/tmp/p30a-censimento-anagrafica.ts` ·
`scripts/tmp/p30a-prescrittore.ts` · `scripts/tmp/p30a-esposizione.ts`.

---

## 5. 🔑 LA CAUSA UNICA — `clienti` fa DUE mestieri in una riga sola

Dopo **D191** («*il cliente può essere anche un'entità, qualsiasi forma giuridica nel panorama
dentale*») ho guardato **che forma hanno davvero** i 39 clienti veri, invece di immaginarla.
`misurato:` `scripts/tmp/p30a-forme.ts` — **sette forme distinte**, e la tabella ne modella **una**:

| forma trovata | quante | esempio reale |
|---|---|---|
| persona fisica nuda | ~12 | `ESPOSITO MASSIMO` · `FAZIO MICHELE` |
| persona col titolo | ~10 | `DOTT. ETTORE TUFARELLI` · `Prof. Dr. FRANCESCO M. FAZIO` |
| studio + nome del titolare | 4 | `STUDIO ODONTOIATRICO PIEGARI GIANFRANCO` |
| studio senza persona | 2 | `STUDIO ODONTOIATRICO` · `Studio Bianchi` |
| **società** | **5** | `GDA STP S.R.L.` · `BARALE S.A.S.` · `Dental Center s.r.l. uninominale` |
| **studio associato, DUE o più dentisti** | **3** | `St. Od.co Ass.to Dr. Guida Agostino Dr. Nunziata Christian` · `Dr. Roberto Sisalli e D.ssa Laura Sisalli` · `Avallone G. & Falcone F.` |
| **non è un cliente: è un contenitore** | 1 | `Pazienti Storici pre-UÀ — Da Assegnare` |

🔴 **E la riga che spiega tutto:** lo **stesso dentista compare in più righe di anagrafica**, perché la
riga non descrive una persona ma «chi paga». `Guida` compare **quattro volte** (`Prof. Guida Dr. Luigi`
· `Prof. L. Dr. GUIDA` · `DOTT. GUIDA AGOSTINO ODONTOIATRA` · dentro lo studio associato n. 34) e
`Nunziata` **due** (da solo e dentro lo stesso associato). ➡️ **Quindi oggi non è possibile sapere QUALE
dei due dentisti di uno studio associato ha prescritto un lavoro** — e l'Allegato XIII chiede
**esattamente quello**.

🔑 **LA CAUSA UNICA, ed è una sola:** `clienti` è costretta a essere **due cose insieme** —
**① l'entità che si fattura** e **② la persona che prescrive**. Ma:
- **la norma le vuole distinte:** Allegato XIII punto 1 chiede la **persona** con qualifiche
  professionali **e, se del caso, l'istituzione sanitaria** (**P37**, **D192**);
- **la fattura le vuole distinte:** `Denominazione` (max 80) **oppure** `Nome`+`Cognome` (max 60
  ciascuno), **mai insieme** — regola ufficiale, [specifiche tecniche
  FatturaPA](https://www.fatturapa.gov.it/export/documenti/Suggerimenti_Compilazione_FatturaPA_1.6.pdf);
- **il mondo vero le ha distinte:** 5 società e 3 studi associati non sono persone, e i loro dentisti
  sono altre entità ancora.

➡️ **Ne segue la forma da portare al panel — un'entità e le sue persone:**
**il CLIENTE** = chi si fattura (forma giuridica · denominazione **oppure** nome+cognome · dati
fiscali) · **i PRESCRITTORI** = una o più persone collegate (nome, cognome, e l'iscrizione all'albo se
serve), e **il lavoro punta al prescrittore**, non al cliente.
🔑 **Questa forma chiude P37 alla radice** invece di rattopparlo, e fa sparire i doppioni.

📌 **Misure di contorno, tutte `provato:`** (`scripts/tmp/p30a-doppioni.ts` ·
`scripts/tmp/p30a-lunghezze.ts`):
- **`Pazienti Storici pre-UÀ` tiene 911 dei 917 pazienti** e **zero lavori**. 🔄 **Corregge la §2 di
  questo stesso referto:** i «917 pazienti» non dicono come si usa l'app — sono un **magazzino di
  importazione storica**. È anche il vero motivo per cui `nome`/`cognome` su `pazienti` sono 2 e 6.
- **Solo 17 clienti su 39 hanno almeno un lavoro.** Gli altri 22 nessuno.
- **Un doppione:** `Dr. Villani Gaetano` esiste in **due righe** (entrambe con 0 lavori e 0 pazienti —
  innocuo oggi).
- **Lunghezze FatturaPA: nessuna violazione oggi** (massimo **58** su un limite di 80; nome max 46,
  cognome max 32 su 60). ⚠️ **Ma nessun controllo lo impedisce:** una denominazione più lunga di 80
  verrebbe **rifiutata dallo SDI** al momento dell'emissione, non prima.
- ⚠️ **UÀ emette SEMPRE `<Denominazione>`** (`generate-xml.ts:405`), anche quando il cliente è una
  persona fisica. **Non è un XML invalido** — la scelta è ammessa — ma **rappresenta una persona come
  un'entità**, ed è la stessa confusione, vista dal lato fiscale.

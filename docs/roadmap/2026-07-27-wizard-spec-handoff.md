> ✅ **SUPERATO il 27/07/2026, sera tardi.** Francesco ha **ratificato la spec** e il **piano dell'ondata (a)
> è scritto**: `docs/superpowers/plans/2026-07-27-wizard-ondata-a-dato-e-api.md` (13 task TDD).
> **Il taglio in tre ondate del §4 qui sotto è stato deciso: sì.** Questo documento resta come storia della
> giornata; il punto di ripresa vivo è il piano.

# Handoff — Il wizard «Nuovo lavoro»: spec pronta, si va al piano (27/07/2026, sera)

**Per:** la sessione successiva, con contesto pulito.
**Prima di tutto:** BP-0 — `memory/SESSION_ACTIVE.md`, poi i due documenti qui sotto. **Non serve rileggere
altro:** tutto quello che conta è lì.
**⚠️ Direttive permanenti:** «Come parlare con Francesco» (`../CLAUDE.md` §7 / `ua-app/CLAUDE.md` §0D) ·
**Regola Advisor** · **Statuto delle fonti** · **mockup PRIMA del codice** (§0B) · **BP-1** prima di fermarsi.

---

## 0. In una riga

**Il brainstorming è chiuso, il gate FASE 3 è superato, il panel advisor 3× è fatto, la spec è scritta.**
Restano: la **ratifica della spec da Francesco**, poi il **piano** (`superpowers:writing-plans`).
🛑 **Niente è committato.** Nessun codice di produzione toccato.

---

## 1. I due documenti che contano

| File | Cosa contiene |
|---|---|
| `docs/superpowers/specs/2026-07-27-wizard-nuovo-lavoro-design.md` | **LA SPEC** — 280 righe: modello dati, API, wizard, DdC, migration, 8 prove, fuori perimetro, non verificato |
| `docs/design/decisions/2026-07-27-wizard-nuovo-lavoro-brainstorming.md` | **IL VERBALE** — 680 righe: 23 decisioni (W1-W23), tabella dei **38 tipi completa**, gate FASE 3, i tre pareri del panel, tutte le fonti |

**Mockup:** `docs/design/mockups/2026-07-27-{denti-colore-wizard,arcata-ovale,denti-illustrazioni-vere}.html`
**Screenshot:** `docs/design/mockups/screenshots/2026-07-27-denti-colore/`
**Illustrazioni di Francesco:** `docs/design/assets/arcata-{superiore,inferiore}.png`, `strisciadenti.png`
**Catena rigenerabile:** `scripts/design/` + `LEGGIMI.md`

---

## 2. Le decisioni che reggono tutto il resto

- **W1 perimetro:** dentro il wizard adattivo, denti+colore per dente, cassetta, prescrizione. **Fuori** (e
  mappati) email e portali degli scanner: dipendono da terzi e non sono provabili senza accessi veri.
- **W2 + W17, due leve diverse:** il **tipo** decide **SE** la domanda compare; quando compare, **si può
  saltare** («Lo scrivo dopo»). *Forzabile* ≠ *saltabile*.
- **W15:** i denti **non si ridisegnano**: si usano le illustrazioni di Francesco con **sagome sovrapposte**,
  ricavate automaticamente dall'immagine.
- **W21 (supera W20):** il documento stampa **la realtà del manufatto consegnato**, non «ciò che è stato
  prescritto». La colonna `provenienza` resta, ma serve al precheck, non a decidere cosa stampare.
- **W22:** nessun blocco al banco. **Il precheck di consegna è il guardiano** di tutti gli obblighi.
- **W23:** `dichiarazioni_conformita.colore_dente` si **elimina** (colonna morta).

---

## 3. 🔑 Le cose trovate nel codice che cambiano il lavoro

Tutte **riverificate personalmente**, non riferite:

1. 🎁 **Il posto giusto esiste già ed è vuoto.** `dichiarazioni_conformita.prescrizione_caratteristiche` è già
   stampata dal PDF (`DdcTemplate.tsx:417-420`) e alimentata a **`null`** (`generate-ddc.ts:99`). È il campo
   di testo libero dell'Allegato XIII: non serve inventare niente.
2. ✅ **Le colonne colore NON arrivano alla FatturaPA** — sono nella `SELECT` e poi non usate. **Rischio
   fiscale zero** (corregge una preoccupazione scritta prima).
3. ⚠️ **La DdC stampa il dato vivo, non lo snapshot** (`DdcTemplate.tsx:258` vs `generate-ddc.ts:97`).
   I PDF emessi **non** cambiano (short-circuit `generate-ddc.ts:41-50`), ma l'immutabilità poggia su un solo
   appiglio.
4. 🔴 **`DENTI_DECIDUO` ha i quadranti sbagliati** (`denti-fdi.ts:56`: il 55 è nel quadrante 1 invece di 5).
   Latente oggi, **attivo con la dentizione mista**.
5. 🔴 **I denti validi non sono un intervallo:** 11-48 include 19/20/29/30/39/40. Sono **52 codici**
   strutturati. Con `fdi smallint` il difetto «2.6» diventa **irrappresentabile**.
6. ⚠️ **VITA classical ha 16 codici, non 19** (T/BL/OM sono fuori scala).
7. ⚠️ **Conservazione 10 anni, non 5** — i 5 erano del d.lgs. 46/1997, abrogato. Il resto del progetto usava
   già 10 ovunque.
8. 🔴 **Trappola del collasso:** «13-23» in FDI attraversa la mezzeria = **6 denti**; un'espansione numerica
   ingenua ne produce 11.
9. 🔴 **Fuori perimetro, da tracciare:** `RicevutaConsegnaTemplate.tsx:347` dichiara 15 anni per un documento
   non impiantabile.

---

## 4. Il prossimo passo, in ordine

1. **Francesco ratifica la spec** (o chiede correzioni).
2. **Piano** con `superpowers:writing-plans` — task atomici da 2-5 minuti, TDD.
3. Poi: branch **nel repo principale** → TDD → FASE 6b (migration gate) → FASE 7 → review → QA browser →
   gate estetico L2 → deploy → BP-1.

⚠️ **Prima del piano vale la pena decidere se il perimetro è troppo grande per un'ondata sola.** La spec
copre: migration + 2 API nuove + wizard riscritto + odontogramma rifatto in v3 + DdC. Un taglio ragionevole
sarebbe: **(a)** dato + API + creazione atomica, **(b)** wizard e odontogramma, **(c)** DdC e precheck.
Non è deciso: proporlo a Francesco.

---

## 5. Trappole logistiche — ancora vere

- 🛑 **NEL WORKTREE IL DEV SERVER NON PARTE** (doppio `package-lock.json` → tutte le route 404). Per un'ondata
  con molto browser: **branch nel repo principale**.
- ⚠️ **`.gitignore` riga 62 ignora `*.png`:** asset e screenshot vanno aggiunti con `git add -f`.
- 🛑 **Il mockup `denti-illustrazioni-vere.html` pesa 30 MB** (immagini in base64): **non committarlo**. Si
  committa il generatore (`scripts/design/`), il mockup si rifà in un minuto.
- ⚠️ **Il pre-commit ferma su `--max-warnings=0`** e `tsc` non vede un import inutilizzato: `npx eslint src/`
  prima di committare.
- ⚠️ **`../CLAUDE.md` e `../ANALISI/` stanno FUORI dal repo git**: non provare a committarli.
- 🛑 **Le password non le digita l'assistente.** Per il QA dietro login entra Francesco.
- ⚠️ **I dati in DB sono di test** (`ua-app/CLAUDE.md` §8): la fedeltà del dato migrato non è un vincolo, la
  robustezza dell'applicazione sì.

---

## 6. Cosa NON è stato verificato (dichiarato, non nascosto)

- Il gate **«testo al 200%»**: il mockup usa px fissi, il test **non misurava nulla**. Da rifare sul device.
- L'ordine dente→colore sulle prescrizioni italiane vere (guardarne cinque, costa poco).
- La base espressa del periodo di conservazione della **documentazione tecnica** per i su misura: l'art. 10(8)
  àncora i 10/15 anni alla dichiarazione UE, che i su misura **non hanno**. Il progetto assume 10 anni: è dal
  lato sicuro, ma **è un'assunzione**.
- Se `DdcTemplate` abbia altri lettori di dati vivi oltre a `denti_coinvolti`.
- Rifiniture note sui mockup: i ritagli dei denti prendono un po' di gengiva · le illustrazioni pesano 2 MB e
  1 MB (WebP) · nella striscia il dente 11 e il 21 non sono speculari.

---

## 7. 📌 Quello che questa giornata lascia

> **Il metodo che ha pagato: non affermare una misura, prenderla.**

Ogni numero di questa sessione è stato misurato dal browser, non stimato — e **tre volte la misura ha
smentito il disegno**: i bersagli a 44 px che si sovrapponevano lo stesso, la schermata che sforava di 105 px
col tasto sotto il bordo, l'ovale che non ci stava in due arcate. Nessuno di quei tre difetti si sarebbe visto
guardando il mockup.

E il corollario: **il riconoscimento automatico dei denti ha trovato un errore nell'illustrazione** — un
incisivo in più — che nessuno aveva contato. La rete che si ferma se i denti non sono 16 non è una comodità:
è quella che ha scoperto il difetto. Non toglierla.

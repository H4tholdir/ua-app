# D121 — i ritrovamenti fuori mandato, in un posto solo (R-E2)

**Data:** 3 agosto 2026 · **Origine:** tornata **38** del verbale (D121, «il passo del wizard aspetta il
wizard») · **Metodo:** panel 3× con mandato di confutare + riverifica a mano di ogni affermazione portante.
**Nessuna riga di codice è stata toccata.** Questi difetti sono **riferiti, non corretti** — R-E2: una
correzione silenziosa lascia il documento sbagliato per tutti i lavori successivi.

> 🔑 **Perché questo file esiste:** i due ritrovamenti maggiori stanno già nel verbale, sotto D121. Gli
> altri sette sono minori presi uno per uno, e non meritano di arrivare a Francesco singolarmente — ma
> sparirebbero con il contesto della sessione. Qui restano.

---

## 1. La direttiva «indietro = pagina precedente» è contraddetta **da una prova verde**

`WizardNuovoLavoro.tsx:220-227` — il tasto ‹ del primo passo fa `router.push('/dashboard')`, mentre la
direttiva permanente del 22/07/2026 impone `router.back()` con fallback solo in assenza di storia.
🛑 **E non è «da fare»: è da smontare da un test.** `tests/unit/WizardNuovoLavoro.test.tsx:98-102` codifica
quel comportamento come **atteso**:

```
it('tap ‹ (Indietro) dal Passo 1 → router.push("/dashboard")', …)
expect(push).toHaveBeenCalledWith('/dashboard')
```

Chi correggerà il componente vedrà rosso e potrebbe credere di aver rotto qualcosa.

---

## 2. Contraddizione **viva** fra il contratto dei passi e la spec che dice di seguire

- `src/lib/wizard/passi.ts:13-20` — **Legge 1:** il passo si identifica per **NOME, mai per indice**, e la
  ragione è scritta: la bozza salvata sopravvive a un rilascio, quindi riaprirla per indice la riaprirebbe
  **sul passo sbagliato coi dati giusti** — nessun errore, nessun test rosso.
- `docs/superpowers/specs/2026-07-28-wizard-ondata-b-schermate-design.md` §7 — la bozza `v:2` porta
  `passo` = «**indice** nella sequenza calcolata».

Chi implementerà leggendo la spec farà l'opposto di ciò che il contratto vieta. **Vince la Legge 1**, e la
riga di spec va corretta. ⚠️ La spec non dichiara nemmeno se l'indice sia 0- o 1-based.

---

## 3. La stessa §7 afferma un fatto che il codice non ha

§7 giustifica lo scarto della bozza vecchia dicendo «*`leggiStato` già restituisce `null` … e la chiave
viene rimossa*». **La chiave NON viene rimossa:** `src/lib/wizard/persistenza.ts:69` fa `return null` e
basta; `azzeraStato()` è chiamato **solo** nel ramo della scadenza (`:71-74`). Una spec ratificata che
motiva una scelta con un comportamento inesistente.

---

## 4. Due prove che, dopo un cambiamento previsto, **restano verdi smettendo di controllare**

| dove | oggi | dopo |
|---|---|---|
| `tests/unit/WizardNuovoLavoro.test.tsx:272` | `queryByRole('img', { name: /Passo \d di 3/ })` — l'unico controllo che i pallini non compaiano nel Frame Fatto | con l'etichetta a numero variabile («Passo 4 di 6») la regex **non aggancia più**: passa a vuoto per sempre. Correzione: `/^Passo \d+ di \d+$/` |
| `tests/unit/wizard-sequenza-passi.test.ts:111` | `.not.toContain('colore')` per `placca_espansione` | se il passo nuovo si chiamerà `'tinta'`, l'asserzione resta **vera a vuoto**: non prova più il confine che era nata per provare |

---

## 5. `ProgressDots` ha un secondo consumatore, fuori dal wizard

`src/app/ds-v3-catalogo/page.tsx:162` (`useState<1|2|3>`) e `:1144` (`<ProgressDots passo={passoDemo} />`),
coi tre tasti demo asseriti da `tests/unit/ProgressDots.test.tsx:128-135` e la voce nel dizionario del
catalogo (`tests/unit/ds-v3/componenti/catalogo.test.tsx:127`). Chi renderà i pallini variabili deve
passare **anche di lì**: non è un componente del solo wizard.

---

## 6. L'etichetta di versione `v:2` della bozza è **già prenotata**

`persistenza.ts:69` è l'**unica** guardia di forma su un `JSON.parse` non validato (`:62-64`), e guarda
**solo** il numero. La spec (b) §7 assegna `v:2` a un carico preciso (`cognome`, `nome`,
`pazienteIdScelto`, `denti`, `colori`). Chiunque spenda `v:2` per un contenuto diverso crea due bozze
incompatibili che **si scambiano per la stessa** e passano la guardia. ⚠️ Da notare anche che la chiave
resta `'ua:wizard-lavoro:v1'` (`persistenza.ts:26`) qualunque sia il numero dentro.

---

## 7. Il conteggio dei tipi, che tre documenti dicono in tre modi

`provato:` conteggio su `src/lib/domain/tipi-lavoro.ts`, escludendo la riga 11 (definizione del tipo, non
un tipo di lavoro): **25** `'catalogo'` + **3** `'libero'` + **10** `'nessuno'` = **38**. In circolazione
si leggono anche «42» (mio, in un brief di questa sessione — sbagliato) e «26 tipi con colore dentale»
(spec D42 §5, corretto in **25** con questa tornata).

---

## 8. Ritrovamenti preesistenti già dichiarati altrove, ancora aperti

- `src/lib/wizard/sequenza-passi.ts:82-88` — per i quattro `scheletrato*` la fonte dice «colore sì **se**
  porta denti», ma nel catalogo `prevedeColore` è `'catalogo'` **incondizionato**. Riferito allora, aperto
  adesso.
- `TabClinica.tsx:8-14` — la tendina del colore sulla scheda offre **19 codici su 48**.
- `PassoPaziente.tsx:41-42` — nel wizard il colore è ancora **testo libero**. È il difetto ① di D121, la
  cui sede naturale è l'ondata delle schermate (che quel blocco lo elimina).

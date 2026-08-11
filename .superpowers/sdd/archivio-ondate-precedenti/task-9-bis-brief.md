### Task 9-bis — `FoglioConferma` (D80)

**File:** 🆕 da creare — `src/components/ds/FoglioConferma.tsx` · 🆕 da creare `tests/unit/ds-v3/componenti/FoglioConferma.test.tsx`

> 🔧 **MANDATO CORRETTO il 30/07 sera (D89). Quello che segue vince sul resto del task. La legge è la
> §5.42 della spec v3 (rev. 3.4).**
> 1. **z-index 1030** (D83) · **`bloccaScorrimento()`** (D84) · pannello con **`overflowY:'auto'`**.
> 2. 🔧 **La ragione «non può essere uno `Sheet` nudo» è CAMBIATA:** quella vecchia (il doppio blocco dello
>    scorrimento) **è stata riparata da D84 e non vale più**. Le due che valgono adesso: ① `Sheet` ha
>    z-index **1000 cablato** (`src/components/ds/Sheet.tsx:466`), quindi sopra il visore (1010) si
>    dipingerebbe **sotto la fotografia**; ② cattura l'àncora del focus al montaggio e non ha la prop per
>    riceverla dal chiamante.
> 3. 🔴 **L'àncora del focus si DICHIARA (F-12), e qui non è un dettaglio:** chi apre questa conferma è
>    **una voce di menù che sta smontando**. Catturare `document.activeElement` significa catturare un nodo
>    staccato → il focus finisce sul `body` → e da lì **`Escape` è morto proprio sulla superficie
>    distruttiva**. Serve `ancoraFocus` nella firma.
> 4. **«Focus alla prima azione» si scrive come PROPRIETÀ, non come posizione** (F-7): «alla prima azione,
>    **che è quella sicura**». Con l'ordine di D82 oggi coincidono; una frase che prescrive una posizione,
>    il giorno che l'ordine si invertisse, manderebbe il focus sul tasto che cancella.
> 5. **Servono l'anteprima dell'oggetto e l'etichetta sicura nella firma** (F-10), che il piano non aveva.
> 6. **«Riduci movimento»: variante ridotta esplicita**, come §5.41 — prova «`y` finale = 0 e nessun tween
>    su `y`». **`Tab` trattenuto** (T5-ter).
> ⚠️ **Un limite che NON si chiude qui, e va lasciato stare (R-E2):** la cancellazione riuscita **non
> produce nessun ritorno non visivo** — `src/components/ds/Avviso.tsx:81-91` fa suonare e vibrare **solo
> l'errore**. È riferito come **FM-8** ed è una decisione di grammatica del design system: **non si
> improvvisa dentro questo task**.

🛑 **Questo task esiste perché Francesco, il 30/07, ha scelto il foglio dal basso contro la card centrata
che il piano aveva dichiarato come scostamento S1 senza chiederglielo (D80).** Numerato **9-bis** e non
«10» apposta: rinumerare i task romperebbe i riferimenti in handoff, memoria e spec.

**Interfacce**
- **Produce:** `FoglioConferma(props: { aperto: boolean; titolo: string; testo: string; etichettaDistruttiva: string; onConferma: () => void; onAnnulla: () => void })`
- **Consuma:** niente da A e B — è un componente puro, come gli altri di questo blocco.

🔑 **Le tre cose già decise, che il task non riapre:**
1. **Non blocca lo scorrimento del corpo.** `provato:` `Sheet.tsx:222` tiene il valore precedente in un
   `useRef` **per istanza** e lo cattura solo se il **proprio** ref è vuoto (`:248-252`): sopra il visore,
   che blocca già (P16), il secondo blocco leggerebbe `hidden` come «valore di prima» e lo
   **ripristinerebbe a hidden per sempre**. Stessa regola della tendina di D78.
2. **Si registra in `storia-overlay.ts` con `'uaSheet'`** (P14), o «indietro» chiuderebbe il visore invece
   della conferma. È il **terzo** strato: visore → tendina → conferma.
3. **Portale su `document.body`** (P20) · **z-index** nell'intervallo libero 302-999, **sopra** la tendina.

- [ ] **Passo 1 — le prove PRIMA:** le due azioni ci sono e **l'ordine è quello di §5.17** (sicura sopra,
  distruttiva sotto) · **annullare non chiama `onConferma`** (il controllo positivo che manca sempre) ·
  **Esc chiude e NON conferma** · `role="dialog"` + `aria-modal` + etichetta · **focus alla prima azione e
  ritorno all'apritore** · 🔴 **la prova che morde:** aprire e chiudere il foglio **mentre
  `document.body.style.overflow` vale già `'hidden'`** → alla chiusura vale **ancora `'hidden'`**, non `''`
  (cioè: non ha né bloccato né sbloccato niente) · il testo **non contiene** parole vietate
  (`src/design-system/v3/dizionario.ts` — «elimina definitivamente» è **vietata**).
- [ ] **Passo 2** — rosso, abbozzo, **conta `N su M`**.
- [ ] **Passo 3** — scrivi, nella forma di casa del blocco C. **G1: nessun import da `form/styles.ts`.**
  La §5.x proposta in **T5** è la fonte di verità: se il gate ha scelto una via diversa, **vale quella**.
- [ ] **Passo 4** — verde. **Mutazione:** fai chiamare `onConferma` anche ad «Annulla» → **atteso rosso** ·
  aggiungi il blocco dello scorrimento → **atteso rosso** sulla prova del corpo.
- [ ] **Passo 5** — salva.

---

# BLOCCO D — l'innesto sulle due superfici


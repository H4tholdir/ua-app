# Referto — T9-bis · ondata (b) · `FoglioConferma` (§5.42, D80)

**Data:** 01/08/2026 · **Ramo:** `ondata-b-schermate` · **Commit:** `3bbbfd18` → `c3929e01` → `e013b961`
**Legge:** spec v3 rev. 3.4 **§5.42** · **Prove e ragioni:** `docs/superpowers/specs/allegati/2026-07-30-ds-v3-sezioni-album.md` §1.4 e **§1.9 (B-6)**
**Piano:** `docs/superpowers/plans/2026-07-30-album-foto-scheda-lavoro.md` → **Task 9-bis**
**Da dove vengo:** `docs/roadmap/2026-08-01-t9-referto.md` · **Dove va:** T10 (l'innesto sulla scheda).

**Esito:** ✅ fatto e **approvato in revisione**. Nasce `src/components/ds/FoglioConferma.tsx` con
`tests/unit/ds-v3/componenti/FoglioConferma.test.tsx` (**50 prove**). Non è montato da nessuna parte — è T12.

---

## 0. Come è stato eseguito — e perché il metodo conta quanto il risultato

🔑 **Primo task dell'ondata eseguito con `subagent-driven-development`**, cioè il modo che R-E1 prescrive
da sempre: **un esecutore fresco per compito, una revisione indipendente fra l'uno e l'altro**. I tre task
precedenti (T7, T8, T9) erano stati eseguiti dallo stesso agente che li coordinava, e in due casi su tre un
difetto vero è emerso **solo dopo il primo salvataggio**.

**Qui la revisione ha lavorato davvero:** ha bocciato la prima consegna su **entrambi** i verdetti
(conformità ❌, qualità da correggere), verificando i rilievi con **19 mutazioni proprie** invece di
credere al rapporto; e nel secondo giro ne ha rifatte altre 6, trovando **due sottostime** nel rapporto del
correttore (una mutazione accendeva 2 prove, non 1 — sbagliata nella direzione buona).
🔴 **E ha trovato la cosa che nessuna verifica automatica vede:** un conteggio `N su M` **gonfiato**. Il
primo rapporto dichiarava «4 su 37»; l'abbozzo però conteneva già la `variantePannello` **vera**, cioè non
era inerte proprio sull'asse che due di quelle prove misurano. Rifatto con un abbozzo davvero inerte:
**3 su 47** — e le tre verdi sono due prove di **assenza** più un ramo che un abbozzo indovina per
costruzione. **Il numero che misura la forza delle prove era esso stesso da verificare.**

---

## 1. FASE 7 — misurata da me, non riferita

```
npx tsc --noEmit  → 0 errori
npx vitest run    → Test Files  368 passed | 3 skipped (371)
                    Tests  4192 passed | 19 skipped (4211)
npx next build    → ✓ Compiled successfully
```

**Il conto torna: +51 = 50 mie + 1 che non ho scritto.** Riferimento a T9 chiuso: **367 | 3** file e
**4141 | 19** prove. `tests/unit/home-style-parsabile.test.ts` passa da **55 a 56** (`provato:` eseguito da
solo): è la quarta volta di fila che questa previsione regge. Albero pulito.

---

## 2. La firma, e i cinque scostamenti dall'interfaccia del piano

```ts
FoglioConferma(props: {
  aperto: boolean
  titolo: string
  testo: ReactNode                            // ← 1. era `string`
  etichettaDistruttiva: string
  etichettaSicura: string                     // ← 2.
  distruttivaDisabilitata?: boolean           // ← 3.
  foto: FotoAlbum                             // ← 4. l'anteprima dell'oggetto
  ancoraFocus: RefObject<HTMLElement | null>  // ← 5.
  onConferma: () => void
  onAnnulla: () => void
})
export function variantePannello(reduced: boolean)   // la variante di movimento, dato puro
```

I punti **2, 3, 4, 5** erano già chiesti dal riquadro «MANDATO CORRETTO» e da §5.42, e **mancavano** dal
blocco «Interfacce → Produce» del piano. Il punto **1** è un ritrovamento dell'esecutore: `testo: string`
**non può portare** «la parte che pesa in `--ink`/700» che §5.42 richiede. Allargato a `ReactNode`.

---

## 3. Il pre-flight: il testo del task contraddiceva il proprio riquadro in TRE punti

Risolti prima del dispatch con la regola di precedenza dichiarata nel piano stesso (riquadro > corpo, e
sopra tutti §5.42):

| il corpo del task diceva | vale invece |
|---|---|
| «**Non blocca** lo scorrimento del corpo», con prova **e** mutazione costruite su quel comportamento | **blocca** (§5.42 + D84: `blocca-scorrimento.ts` è un contatore unico). La prova è la ricetta di §1.4; **la mutazione si inverte** («togli il blocco → rosso») |
| z-index «nell'intervallo libero **302-999**» | **1030** |
| firma senza àncora del focus, senza anteprima, senza etichetta sicura | firma estesa (v. §2) |

🔴 **È lo stesso difetto di forma trovato in T8 e in T9: tre task su tre.** Un riquadro corregge la testa
del task e il corpo resta a dire il contrario — e il corpo è dove stanno i **passi da eseguire**. Chi
leggesse un Passo senza il riquadro scriverebbe la prova sbagliata: qui erano **due**, la prova principale
e la mutazione.

---

## 4. Che cosa sorveglia il componente

- **Ogni via di fuga chiama `onAnnulla`, MAI `onConferma`:** «Annulla», velo, `Escape`, «indietro», swipe.
  E — dopo il secondo giro di correzioni — **anche quando il tasto distruttivo è disabilitato**: tre prove,
  una per ramo, ognuna provata per mutazione (1 prova accesa ciascuna). Erano tre vie di fuga da una
  superficie **distruttiva** che si potevano spegnere tutte e tre senza che una prova battesse ciglio.
- **Focus alla prima azione, che è quella SICURA** — scritto come **proprietà** (ricerca per etichetta),
  non come posizione: il giorno che l'ordine dei due tasti si invertisse, il focus non finirebbe sul tasto
  che cancella.
- **`Escape` sul pannello con `stopPropagation()`**, provato con uno `Sheet` fratello sotto.
- **Lo scorrimento**: ricetta di §1.4 alla lettera (sentinella `scroll` + `7px`), più la prova speculare dei
  due strati chiusi nell'ordine sbagliato.
- **Nessun suono e nessuna vibrazione chiamati da questo componente**: li portano i due tasti.
- **«Riduci movimento»**: variante ridotta **esplicita** di §1.9 (B-6), `y` che resta nel bersaglio,
  provata sull'**oggetto vero**.

---

## 5. 🔴 Riferito, non corretto (R-E2)

**① L'`exit` delle varianti non gira mai — e riguarda TUTTI E QUATTRO gli strati nuovi.** Nessuno di
`VisoreFoto`, `TendinaMenu`, `FoglioCategoria`, `FoglioConferma` monta `AnimatePresence` (verificato dal
revisore: in `src/` esiste solo in `Sheet`, `DialogConferma`, `RigaFase`, `Avviso`). La chiave `exit` è
scritta e provata **come prop**, ma l'animazione d'uscita non gioca: si esce di colpo. 🛑 **Si decide
insieme al gate estetico L2 (T13)**, non per un componente solo — farlo qui darebbe un foglio che esce
animato sotto tre strati che spariscono.

**② L'effect del focus dipende dall'IDENTITÀ di `ancoraFocus`** (condiviso con `FoglioCategoria.tsx:183`):
un chiamante che passasse un letterale inline `{ current: x }` si farebbe **strappare il cursore** a ogni
rerender del genitore. Da chiudere nei brief di T10-T12, che sono i chiamanti veri.

**③ `TastoPrimario` avvisa in sviluppo se `disabled` arriva senza `motivoDisabilitato`, ma l'anatomia di
§5.42 è CHIUSA e non prevede nessuna dida.** La prima consegna aveva aggiunto una riga di testo visibile
(«Un attimo…») non ratificata e senza mockup: tolta in revisione, **e ora una prova la vieta**. Il conflitto
fra il contratto del componente e l'anatomia della spec è scritto sul posto e **non risolto di nascosto**.

**④ In tema scuro «Annulla» e il pannello avrebbero lo stesso colore** (`--elv` = `#2B2620` per entrambi),
distinti solo da una hairline al 6%: `TastoSecondario` usa `var(--elv)` come propria faccia e in scuro perde
bordo pieno e ombra. Misurato su `ds-v3.css:13/48/65-68`, non assunto. La casa ha già il pattern di rimedio
(`ds-v3.css:83-87` rimappa `--card → --elv` dentro `.ds-sheet`). **Da guardare con uno screenshot scuro al
gate estetico L2**, e da decidere lì: tocca il design system condiviso, quindi passa dal suo gate.

---

## 6. I cinque Minori portati alla revisione finale di ramo

1. Il commento «GARANTITO E PROVATO» cita **metà** delle prove che lo reggono (le tre nuove esistono ma non
   sono nominate) — una riga.
2. **Il cablaggio dello swipe resta scoperto:** togliendo `drag="y"`, `dragControls` o l'innesco sul manico
   **nessuna prova si accende** — in un browser il gesto sarebbe morto e la suite verde. La *decisione* è
   provata, il *collegamento* no.
3. **Collaudo a browser dovuto:** il focus che il browser sposta sul `body` quando il tasto distruttivo si
   disabilita mentre lo tiene (jsdom non lo riproduce; il commento lo dichiara).
4. **Il brief di T12 deve portarsi due cose**, o si perdono: il testo ratificato di §5.42 **verbatim** e il
   `<strong>` su «e dall'archivio». Qui è provato solo che il componente **non tronchi** ciò che riceve.
5. **Screenshot 390/768/1280 × chiaro/scuro** mancanti, e con essi il contrasto del punto ④.

---

## 7. Che cosa resta aperto dai task prima (nessuno è mio)

`ROADMAP-UFFICIALE.md` descrive ancora l'ondata (b) come «*da pianificare*» — da sistemare **prima del
merge** · `MenuVoce` col chevron sulla distruttiva (F-6) · `TastoTondo` senza `aria-haspopup`/`aria-expanded`
e `sopraFoto.facciaAttiva` a zero usi (entrambi **T10**) · **R27** · **R29 + D81** (foto rotte su
uachelab.com fino al merge, **T13**) · **FM-8** · tredici overlay di `src/components/features/**` che
promettono `aria-modal` senza mantenerlo · **la prova a text-zoom 200% di `FoglioCategoria`** (§5.41, §13.3)
e la `guardia-navigazione-overlay.mjs`, dovute a **T13/FASE 9b**.

**Nessuna decisione nuova di Francesco:** il verbale resta a **novanta**, la prossima è **D91**.

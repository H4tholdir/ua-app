# Revisione dei Task 5 e 5-bis — il foglio dell'avviso

**Quando:** 09/08/2026, sera. **Chi:** l'orchestratore, sul codice vivo e sul catalogo.
**Esito:** ✅ **entrambi si chiudono.** 🔴 **E il Task 5-bis ha corretto un errore del MIO mandato con una
misura**, non con un'opinione.

## 1. Verificato da me

| cosa | esito |
|---|---|
| Albero, `main` | pulito · `main` intatta a `7427a680` · **248** salvataggi · **pubblicato** (il push all'esecutore era stato rifiutato: l'ho fatto io) |
| Il banco è intatto | `provato:` 299 lavori · 39 clienti · 7 utenti · 3 laboratori · 6 dichiarazioni · **0 avvisi**. La «cancellazione del banco di prova» del resoconto era **locale**, non sul database ✅ |
| Nessuna animazione inventata | `provato:` `grep -c "duration:"` → **0**; nessun import di `motion/react`: il foglio non anima nulla di proprio (Legge 7) ✅ |
| Componenti e token | import **solo** da `@/components/ds/*` e `@/design-system/v3/tokens` ✅ |
| Navigazione | `router.refresh()` **solo alla chiusura**, **zero** `router.push` ✅ (`useNavigaDaOverlay` non serve: il foglio non naviga) |
| La via di fuga | `FINESTRA_ANNULLO_AVVISO_MS = 10_000` + `LinkQuieto` ✅ |
| Prove | **56 su 56** (`AvvisoDentista`) · **94 su 94** con il campo nuovo del design system ✅ |

**Riferito, non verificato da me:** `verify:full` a `5902 | 119` su 465 file. Ho misurato i file toccati e
i tipi. **Le saltate restano 119.**

## 2. 🔴 L'errore del mio mandato, corretto con una misura

Il brief del Task 5-bis diceva che un ritorno a `da_comunicare` è scrivibile «**azzerando i due campi**»
(autore e data). **Sono TRE.** Il secondo vincolo (`avviso_testo_solo_se_dall_app`, stretto dal Task 1)
pretende che ogni stato diverso da `comunicato_dall_app` abbia `testo_inviato` **a `NULL`**: senza, risponde
`23514`.

🔑 **E la conseguenza è più grande dell'errore:** un ritorno **cancellerebbe il testo comunicato**, cioè
**la prova ex Art. 5(2)** di che cosa è stato detto al dentista, senza lasciare traccia. ➡️ Il che rende la
strada scelta — **differire la scrittura di 10 secondi** — non solo più semplice ma **più corretta**: un
tocco per sbaglio **non entra affatto** nel registro, invece di entrarci e poi essere cancellato.

## 3. Il censimento ha deciso meglio del mio mandato

Il brief presentava la consegna come *il* precedente. L'esecutore l'ha aperta e ha trovato che **non è un
meccanismo: sono due, divisi per reversibilità** (`20260710091500_rpc_consegna_annullo_atomiche.sql`):
ciò che **ha uno stato di ritorno** si scrive subito e si rovescia; ciò che **non si disfa** si **differisce
per la durata esatta della finestra** (la fattura entra in coda con `emetti_dopo = now() + finestra`).
➡️ **`avvisi_dentista` sta sulla seconda metà per costruzione**, perché il vocabolario non ha «annullato».
Quindi non nasce un secondo modo di annullare: si usa la metà giusta di un modello **già in produzione**.

## 4. Due prove erano verdi per il motivo sbagliato

Togliendo la conferma, **3 prove su 45** sono arrossite — fra cui quella che sorvegliava proprio il numero
di tocchi. 🔴 **Ma due sono rimaste verdi per il motivo sbagliato:** cercavano il bersaglio con un pezzo di
frase (`/l'ho avvisato io/i`) che combacia **anche con la riga di scelta**, quindi hanno seguito il tasto
**mentre si spostava**. 🔑 *Un selettore per frammento non prova dove sta una cosa: prova che esiste da
qualche parte.* Le prove nuove usano nomi esatti.

## 5. Ciò che passa al Task 6 (e a Francesco)

1. 🔑 **La parità nei tocchi di D335 NON c'è più, ed è dichiarata:** dalla scheda, WhatsApp costa **3**
   tocchi (invariato, è D334 che li impone), «a voce» **2**. Resta pari tutto il resto: stesso componente,
   stessi token, **nessun tasto fisico** su nessuna delle due. **Se la disparità va chiusa, si chiude su
   D334** — cioè decidendo se il testo resta modificabile: **è una decisione di Francesco**, non un
   aggiustamento.
2. 🛑 **Il Task 6 decide cosa passare come `pazienteMostrato`** — la deroga ⚖️ D350 vive **lì**, in un punto
   solo, e la spec §2.1 è già aggiornata con la terza voce.
3. 🔑 **Il nome del laboratorio:** il Task 6 lo passa da `lavoro.laboratorio?.nome` — `provato:` la scheda
   lo legge già (`lavori/[id]/page.tsx:38`), quindi **nessuna lettura in più**.
4. 🟠 **Difetto suo, dichiarato e misurato:** a 390 la striscia dell'annullo è **126px** contro i **101**
   della riga (0 di scarto a 768 e 1280) — resta così perché smontarla lascerebbe la via di fuga senza
   posto.
5. 🟠 **Strada 2 aperta, e serve per un caso vero:** correggere un avviso chiuso **ieri**, che dieci secondi
   non coprono. Richiede un ramo nuovo nella rotta → **riferito, non fatto**.
6. 🟠 Fuori mandato: `AnnullaConsegnaBanner.tsx:102` ha `role="alert"` su un contenuto che **cambia ogni
   secondo per dieci minuti** — in produzione, altro mandato.

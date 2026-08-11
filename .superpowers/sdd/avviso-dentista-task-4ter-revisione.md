# Revisione del Task 4-ter — la firma dei messaggi (⚖️ D345)

**Quando:** 09/08/2026, sera. **Chi:** l'orchestratore, sul codice vivo e sulla storia di git.
**Esito:** ✅ **si chiude.** 🔴 **E l'esecutore ha trovato un errore MIO in tre documenti vivi**, che ho
corretto in questa tornata.

## 1. 🔴 L'errore mio, e il meccanismo per cui l'ho fatto

Nel verbale di D345, in `MEMORY.md` e nella roadmap avevo scritto: «*ogni sollecito di pagamento mandato
finora si firma col nome dello strumento invece che del mittente*». **È falso.**

`provato:` `git show a500d4b9:src/lib/consegna/whatsapp-template.ts` — le **due** occorrenze di «UÀ Lab»
stavano **entrambe dentro `buildWhatsappMessage`**, che è la funzione della **consegna**.
**`buildWhatsappSollecito` non era firmato AFFATTO.**

🔑 **Il meccanismo, ed è lo stesso che ieri ha rovinato sei mandati su sette:** ho letto «due occorrenze in
un file usato da quattro componenti» e ho attribuito la stringa **a tutti i chiamanti**, senza guardare
**in quale funzione** vivesse. Un grep dice *dove* sta una stringa, non *chi* la produce.
➡️ **Il danno era vero, la sua forma no.** E il difetto vero del sollecito è **peggiore da raccontare**:
un messaggio con cui si chiedono **soldi** a un dentista **non diceva chi lo mandava**, e `provato:`
**nessuna** delle 5.793 prove lo guardava.

## 2. Verificato da me

| cosa | esito |
|---|---|
| «UÀ Lab» non è più prodotto da nessuno | `provato:` `grep -rn "UÀ Lab" src/ tests/` → **17 occorrenze, tutte commenti o prove che la VIETANO**. Nessuna la emette ✅ |
| Prove | `npx vitest run` sui quattro file toccati → **69 passate su 69** ✅ |
| Tipi | `npx tsc --noEmit` → **`TSC_EXIT=0`** ✅ |
| Il modulo nuovo | `src/lib/messaggi/firma.ts` — **una fonte sola**, con le tre alternative scartate **scritte accanto** e il motivo di ognuna ✅ |
| Il campo scelto | `laboratori.nome` — e la ragione è **misurata**: `nome` è `NOT NULL`, `ragione_sociale` è **nullable**, quindi scegliere quest'ultimo *garantirebbe* il ramo «senza firma» ✅ |

**Riferito, non verificato da me:** `verify:full` a `5833 | 119` su 464 file. Ho misurato i quattro file
(69 su 69) e i tipi. **Le saltate restano 119**, che è la cosa che conta.

## 3. Ciò che l'esecutore ha fatto meglio del mandato

- **Il censimento l'ha chiuso `tsc`, non un grep:** ha reso il parametro **obbligatorio** e ha lasciato che
  il compilatore elencasse i chiamanti — **20 errori su 5 file**, di cui **uno che nessuno dei tre inneschi
  aveva nominato** (`tests/unit/scadenzario-chiede-il-cellulare.test.tsx`). 🔑 È la forma giusta di R-P2:
  *l'elenco dei file non lo decide l'autore*.
- **Il nome che manca non diventa una firma finta:** ha enumerato le tre alternative peggiori
  (`— undefined`, gallone nudo, «UÀ Lab» come ripiego — cioè il difetto rimesso dentro dalla porta di
  servizio) e ha scelto la quarta: **la riga della firma non esiste**. Provato su 5 rami × 3 forme di
  assenza.
- **Nessuna seconda via di lettura:** il nome entra dall'incastro già presente (`laboratori(nome)`) per la
  consegna e dal contesto del laboratorio per lo scadenzario — **nessuna andata in più al banco**.
- **Ha trovato che tre sonde di un cancello GDPR si degradavano in silenzio:** l'errore soppresso era
  diventato «chiave mancante» invece di «proprietà vietata», e `tsc` restava verde. Riparate **e
  falsificate** (`TS2578` togliendo il campo).

## 4. Il mockup approvato mostrava ancora la firma vecchia

Rilievo ⑤ dell'esecutore, ed era vero: `2026-08-09-avviso-al-dentista.html` portava «— UÀ Lab» in **due**
textarea. **Corretto in questa tornata** («— Laboratorio Formicola»): quel file è **l'ingresso di disegno
del Task 5**, quindi lasciarlo avrebbe rimesso la stringa vietata nel codice **passando dal disegno**.

## 5. Che cosa passa al Task 5

1. 🛑 **`buildAvvisoMessage` ora PRETENDE il nome del laboratorio:** non ha ancora chiamanti, quindi il
   Task 5 è il primo — **e non può dimenticarlo**, perché la firma della funzione lo impone.
2. 🎨 **Il disegno è la variante A2**, e il mockup è aggiornato con la firma giusta.
3. 🟠 **Riga 51 della coda:** due messaggi che escono **senza nessuna firma** — uno è a un **dentista**
   (`PortaleLinkButtons.tsx:86`), ed è il caso di confine da prendere per primo.
4. ⚠️ **Resta `non provato`** (dall'esecutore, tutto legittimo): l'incastro contro il banco vero (le prove
   girano su banco finto) · il ramo `admin_sistema` con sessione vera · la FASE 9, non dovuta perché per
   **D245** questo è **contenuto** (zero token, zero stili, zero markup: l'unica cosa osservabile è il
   testo dentro WhatsApp).

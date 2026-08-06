# Collaudo a schermo delle tinte — §0② finalmente fatto (06/08/2026)

**Quando:** 6 agosto 2026, ore 07:52-07:56 (`provato:` `date` → `2026-08-06 09:58 CEST` alla scrittura;
gli orari degli scatti vengono dai log del banco e da `updated_at` in banca dati).
**Dove:** banco `ua-prod-3020` (build di produzione locale), utenza `h4t@live.it` (titolare del
laboratorio a cui appartiene il lavoro), viewport **390×844**, tema **chiaro**.
**Lavoro di prova:** `2026/0008` — «Apparecchio funzionale», tipo `ortodonzia`.
**Codice sotto prova:** ramo `tinta-scheda-t7` col salvataggio `8730ea6d` (D260) già dentro.

> 🔑 **Perché è la prima volta.** Fino al 05/08 il collaudo era **impossibile**, e per un motivo vero:
> col solo T7 non esisteva alcun modo, dall'interfaccia, di **mettere** una tinta — la riga compariva
> solo se una tinta c'era già. Il T8 ha messo il campo sulla pagina di modifica, e il percorso si è
> chiuso. Una riga scritta a mano in banca dati avrebbe provato che la riga si disegna, **saltando il
> percorso che conta**.

---

## 1. I quattro passi, tutti riusciti

| # | Passo | Esito | La prova |
|---|---|---|---|
| ① | Mettere una tinta **dall'app**, dalla pagina di modifica | ✅ | «Rosso» risulta `[pressed]` nell'albero di accessibilità, poi «Salva» |
| ② | **Rileggerla dalla banca dati** (non dallo schermo) | ✅ | `tinta_famiglia='resina_ortodontica'`, `tinta_codice='rosso'`, `updated_at` 07:53:26 |
| ③ | **Vederla sulla scheda** e premerla (T7 · D247) | ✅ | riga «Tinta — Rosso»; il foglietto apre **sulla scheda** → `scheda-foglietto-390-light.png` |
| ④ | Cambiare il tipo e sentirsi dire **«ti ho tolto la tinta»** (ramo D117) | ✅ | tipo → `protesi_fissa`, tinta a `null` alle 07:55:56, e l'avviso compare → `d117-avviso-tinta-tolta-390-light.png` |

**🔑 Il dettaglio del ② che vale da solo:** la famiglia `resina_ortodontica` **non è stata mandata dal
client** — l'ha **dedotta il server** dal tipo del lavoro. È esattamente il contratto di `tinta.ts:94-97`,
e fino a oggi era provato solo dai test, mai da un giro vero.

**🔑 Il ④ era IRRAGGIUNGIBILE fino a ieri.** Il form mandava *sempre* la tinta nel corpo della PATCH,
quindi la rotta prendeva sempre il ramo «l'utente ha chiesto una tinta» e quello di D117 non si apriva
mai. L'ha chiuso il P8-① del T8. Oggi il ramo si è acceso davvero.

---

## 2. 🔴 Il difetto che il collaudo ha trovato — l'avviso copre il campo sotto

**Non introdotto da D260** (che non tocca l'interfaccia): vive in `LavoroFormClient.tsx:428-450`, ed
è lì da quando l'avviso è stato scritto. **Si vede solo guardando**, ed è il motivo per cui il gate a
schermo esiste.

**Misurato, non a occhio** (`getBoundingClientRect` sul banco, viewport 390):

| Elemento | Da | A |
|---|---|---|
| Il riquadro dell'avviso (`role="status"`, `position: absolute`) | 620px | 700px |
| L'etichetta **«Priorità»** | 633px | 651px |
| La tendina «Priorità / Normale / Urgente / Extra urgente» | 633px | 706px |

➡️ **L'etichetta «Priorità» è coperta per intero**; la sua tendina lo è per **67px su 73**.

**La causa, in una riga:** il riquadro è `position: absolute` con `bottom: 72px`, quindi **non occupa
spazio nel flusso** e si stampa sopra ciò che ha sotto. Lo stesso vale per il riquadro rosso
dell'errore (`:396-417`), che però è momentaneo — mentre **l'avviso D117 resta finché non si salva di
nuovo**, e nel frattempo nasconde un campo che si può voler correggere proprio in quel momento.

🛑 **Riferito, NON corretto (R-E2):** è fuori dal mandato di questa sessione, che era la correzione
D260 più il collaudo. E toccarlo cambierebbe l'**aspetto** di una superficie → **gate estetico L2
dovuto** (D245), che è già arretrato su due superfici. La correzione si apre con il suo gate, non di
soppiatto.

---

## 3. Quello che si è visto della tavolozza, e che era il timore della §0③

✅ **«Glitter multicolore» NON sfasa la riga.** Era il caso limite dichiarato: il nome più lungo del
catalogo, e `grid-auto-rows` esiste proprio perché sul mockup sfasava. Nel componente vero, **a 390 e
su due colonne, sta su una riga sola** e la griglia resta a passo costante. Si vede in entrambi gli
scatti.

✅ **D253 si vede funzionare:** la riga non sparisce quando non c'è tinta — dice **«Nessuna tinta»** ed
è premibile.

✅ **Le 18 caselle sono `button` con nome accessibile corretto** (letto dall'albero di accessibilità,
non dai pixel).

🟡 **Il tasto flottante 📦 «Apri pacchetto documenti MDR» si sovrappone alla tavolozza** e, a scorrimento
fermo, copre proprio la casella «Glitter multicolore». Stessa famiglia del difetto §2 — riferito
insieme a quello.

---

## 4. 🛑 Quello che questo collaudo NON è

**Non è il gate estetico L2** della §0③, e non va scambiato per tale. Il gate vuole **3 viewport
(390/768/1280) × 2 temi (chiaro/scuro) × le 12 sezioni della checklist**, su **due** superfici (la
scheda e la pagina di modifica). Qui c'è **un viewport e un tema**: 2 scatti, non 60.
➡️ Il gate resta **dovuto e arretrato**. Questi scatti sono il suo inizio, non la sua chiusura.

## 5. I file

| File | Cosa mostra |
|---|---|
| `scheda-foglietto-390-light.png` | Il foglietto della tinta aperto **sulla scheda** (D247), «Rosso» selezionato, la tavolozza intera |
| `d117-avviso-tinta-tolta-390-light.png` | L'avviso di D117 dopo il cambio di tipo — **e la sovrapposizione del §2** |

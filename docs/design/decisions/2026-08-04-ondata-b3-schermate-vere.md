# Decisione 0B — Sessione ③ dell'ondata B: le schermate VERE (D223-D225)

**Quando:** 4 agosto 2026, sera (`provato:` `date` → `Tue Aug 4 18:00:37 CEST 2026`).
**Decide:** Francesco Formicola · **Verbale:** tornata 84 (D223-D225) in
`2026-07-28-wizard-ondata-b-decisioni.md`.
**Mockup:** `docs/design/mockups/2026-08-04-ondata-b3-schermate-vere.html` (11 scene) ·
**Scatti:** `docs/design/mockups/screenshots/2026-08-04-ondata-b3/` (66: ogni scena × 390/768/1280 × chiaro/scuro).
**Panel advisor (Regola Advisor, PRIMA della scelta):** tre lenti — operatività al banco ·
normativa MDR · design system v3. Verbatim dei pareri nel run `wf_4c1b6623-81a` della sessione.

Le decisioni di fondo NON si sono riaperte: l'etichetta e lo sgancio di D210, il foglio a2 di
D222 e il gesto di D212 sono nei mockup coi testi invariati alla lettera.

---

## §1 Le scelte

| # | Scelta | Esito | Panel |
|---|---|---|---|
| **D223** | Riga «Colore» chiusa nel Passo 3 | **Variante B «nome asciutto»**: nome «Colore», sottotitolo «come scritto sulla prescrizione · es. A3»; framing pieno all'apertura | 2-1 (banco+DS; MDR per la A) |
| **D224** | Riepilogo del «Fatto!» | **Due carte**: «Il lavoro» (com'è + Prescritto da) + «La prescrizione» (Elementi · Colore · Foglio del dentista) | 3-0 unanime |
| **D225** | I tre assetti derivati | **Tutti e tre approvati** (CTA che cambia mestiere · riga Colore in scheda · Prescritto da nel Fatto) | nessuna riserva bloccante |

## §2 Perché (in breve, dai pareri)

- **B sulla riga chiusa:** si digita solo a riga aperta, dove il framing di D210 è pieno e
  identico nelle due varianti; da chiusa l'addetta fa scansione e cerca «Colore» — la B glielo
  dà al ritmo delle righe sorelle. La A costa due righe a 390px e pesa come un obbligo dentro
  un blocco che ha per patto lo zero attrito.
- **Due carte sul Fatto:** la carta «La prescrizione» è l'insieme esatto delle cose copiate dal
  foglio — confronto 1:1 col foglio ancora in mano; il confine dello snapshot esiste come
  struttura (non solo come pastiglia); lo snapshot vuoto resta VISIBILE (carta ridotta alla sola
  riga fonte) invece di mimetizzarsi; la catena ambra «Da allegare» → CTA rosso «Allega la
  prescrizione» è contigua.

## §3 Le riserve del panel — VINCOLI del piano ③ (si integrano o si motivano, mai si ignorano)

1. **(banco, su D223)** La B regge SOLO perché lo stato aperto ripete il framing pieno nel
   momento della digitazione. Se il campo diventasse compilabile in-place senza stato aperto,
   la B va ripensata. *(Scritto anche nella conseguenza di D223.)*
2. **(banco, su D224)** Specificare dove atterra il colore **sganciato** («lo scegliamo noi»)
   nel riepilogo del Fatto: presumibilmente riga della carta «Il lavoro», senza pastiglia —
   il valore appena digitato NON deve sparire dalla vista di chi l'ha scritto.
3. **(banco, su D225①)** I due link quieti del Fatto («Fotografa l'impronta» · «Torna alla
   home») affiancati a 28px sono un rischio di tap sbagliato: più aria o impilarli; l'ordine
   resta stabile (azione a sinistra, uscita a destra).
4. **(MDR, su D225①)** La terza voce dell'a2 («Non ce l'ho ancora qui») registra una PROMESSA
   di fonte: NON inverdisce la pastiglia (resta ambra «da allegare») e NON riporta il primario
   a «Fotografa l'impronta». Solo l'allegato reale chiude l'anello; il gate di consegna resta
   armato (V7).
5. **(MDR, su D225②)** Gli stati della riga «Colore» in scheda si specificano nel piano:
   (a) «lo scegliamo noi» con segnale POSITIVO (pastiglia quieta o sottotitolo — l'assenza di
   pastiglia da sola non basta); (b) post-divergenza la scheda mostra prescritto E realizzato,
   come la via di D212 promette.
6. **(MDR, trasversale)** La pastiglia «✓ dalla prescrizione» su «Elementi» è coperta da
   **W20** (gli elementi nascono `prescritto` — spec ondata B, V2): non serve una D nuova né
   un framing sulla riga «Elemento» del Passo 3. Se W20 venisse mai riaperta, questa pastiglia
   si riapre con lei.
7. **(DS, su D225①)** La spec DS v3 **§7.3** fissa ancora il primario del Fatto come
   «Fotografa impronta e prescrizione»: serve la riga di emendamento nella spec (non solo il
   codice), o spec e superficie divergono.
8. **(DS, su D225②③)** La pastiglia sotto il valore è un'**estensione dell'anatomia RigaDato
   (§5.10)**: va scritta lì come «RigaDato con pastiglia di provenienza», tenuta scarsa (solo
   dove la provenienza esiste: colore, elementi — mai generalizzata).
9. **(DS+MDR, su D225③)** «Prescritto da» resta **senza pastiglia** (è identità, non contenuto
   prescritto — All. XIII p.1 lo elenca come voce propria della DdC, separata dalle
   caratteristiche; è un'ECCEZIONE deliberata al principio «mai dal caso», documentata qui).
   A prescrittore ignoto la riga NON compare (mai vuota). Tenere l'adiacenza Dentista →
   Prescritto da.

## §4 Nota di fedeltà del mockup

**Valori dimostrativi ≠ testi vincolanti (risoluzione del controllore, T2 della ③, 04/08 sera):**
nei mockup i VALORI di esempio (colore «A3», lavoro n.147, «Studio Bianchi») sono dati
dimostrativi; i testi vincolanti di D223 sono le FRASI del framing. Nella riga chiusa del Passo 3
in produzione l'esempio resta «es. A2» com'era prima dell'ondata: cambiarlo in «A3» avrebbe
mosso un valore senza ragione. Il codice cita QUESTA nota.

La scena del Fatto comprime la consegna a una riga e i margini verticali di 2-4px perché lo
scatto 390×844 mostri anche i comandi in fondo (il vero scorre, lo scatto no): il React usa i
token veri, non queste compressioni. La testata del wizard nei mockup usa i ProgressDots veri
(la ① usava «Passo 3 di 3», che non esiste in produzione).

# Brief combinato T3+T9 — il «Fatto!» a due carte COL suo foglio a2 (adjudicazione del controllore: un solo esecutore, così il CTA primario non resta mai senza azione)

### Task 3 — T3 · FrameFatto: due carte (D224) + CTA che cambia mestiere
- Carta «Il lavoro»: righe attuali + «Prescritto da» SOLO se `richiedente_nome` presente (vincolo
  0B-9: mai riga vuota; adiacenza Dentista → Prescritto da) + il colore SGANCIATO atterra qui come
  riga senza pastiglia (vincolo 0B-2: il valore digitato non sparisce).
- Carta «La prescrizione»: Elementi (dai denti, tutti `prescritto` — W20, vincolo 0B-6) · Colore
  se trascritto · riga «Foglio del dentista» con stato (`Da allegare` ambra / `✓ Allegata · <forma>`
  verde con miniatura). Pastiglie `✓ dalla prescrizione` (estensione RigaDato — T7 la ratifica in
  spec).
- CTA: senza fonte «Allega la prescrizione» (apre T9); con fonte «Fotografa l'impronta».
  Aria-label `:259` aggiornata insieme (fatto censimento: copia nascosta) + commento D97 riscritto.
  Link quieti con più aria/impilati (vincolo 0B-3), ordine: azione a sinistra, uscita a destra.
- ⚠️ Vincolo 0B-4: il riferimento-promessa (terza voce a2) NON inverdisce la riga fonte e NON
  cambia il CTA: verde solo con allegato reale (immagine) o fonte con corpo vero.
- Verifica: unit FrameFatto + scatti.


### Task 9 — T9 · Il foglio a2 (UI + upload) — dopo T3+T4
- Sheet a 3 voci (testi INVARIATI D222): «Scatta una foto» (input capture) · «Dalla galleria o un
  PDF» (`accept="image/*,application/pdf"` SENZA capture — precedente TabImmagini:391) · «Non ce
  l'ho ancora qui» (fonte_tipo email/piattaforma + riferimento).
- Flussi: foto/galleria → POST immagini categoria `'prescrizione'` → route fonte con
  `fonte_immagine_id`; terza voce → route fonte con solo riferimento, e la UI resta AMBRA
  (vincolo 0B-4).
- Tipo-fonte dedotto dal gesto, mai domanda (spec §4.2).
- Verifica: unit + giro a banco.


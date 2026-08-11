### Task 8 — T8 · Cancellazione immagini: il pre-check PRIMA della distruzione
- `[imgId]/route.ts`: PRIMA di `storage.remove` (`:214`), controllo «questa immagine è
  `fonte_immagine_id` di qualche `lavori_prescrizioni`?» → 409 «fonte in uso» SENZA toccare nulla
  (prova S7: la FK morde, ma morde DOPO — fatto 8). Mappare comunque 23503 sulla .delete()
  (cintura e bretelle). Messaggio distinto dal 409-consegnato (oggi unico generico —
  SchedaLavoroV3:270,290) e consapevole del clone (fatto 9: la fonte può essere di un rifacimento).
- Verifica: unit con mock che conta l'ORDINE delle chiamate (il pre-check deve stare prima).


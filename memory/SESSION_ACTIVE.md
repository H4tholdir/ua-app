# Sessione attiva — il contratto ai dentisti riscritto (D125-D126)

🚪 **PUNTO DI RIPRESA: `docs/roadmap/2026-08-03-panel-dpa-referto.md`** — il referto del panel, con l'Allegato
XIII verbatim e gli otto ritrovamenti fuori mandato.

✅ **Fatto oggi:** **D123** (il documento segue il lavoro finché il lavoro è aperto) · **D124** (si parte dal
contratto ai dentisti, panel allargato) · **D125** (emendata la base normativa ratificata: il termine di
10/15 anni sta nell'**Allegato XIII punto 4 da solo** e riguarda la **dichiarazione**) · **D126** (riscritto
**tutto** il testo del contratto: quattro citazioni, conservazione, **tre affermazioni di sicurezza false**,
sub-responsabili con UÀ dichiarata, cinque clausole Art. 28, Art. 7 nuovo sui ruoli).

📌 **Misurato a mano:** `tsc` **0** · `vitest` **371 | 3** file e **4292 | 19** prove · `next build` **0** ·
`tests/unit/dpa-pdf-content.test.ts` **17 su 17**, nate rosse **15 su 17**.

🔴 **Cosa resta, in ordine:** la parte **(b)** della riga 10 — il contratto **dimostrabile** (persistenza,
versione, numero progressivo: **con migration**) · le righe **12-20** di «I documenti che escono dal
laboratorio», otto ritrovamenti del panel · **D42** (piano pronto, 9 task, R-E1) · il round 2 dell'audit.

❓ **Una domanda per Francesco è ancora senza risposta:** il contenitore `documenti` su Storage è **pubblico
o privato**? Serve il suo occhio sul pannello Supabase — il repo non può dirlo (riga 16).

🚀 `main` = **`e90a21a2`** + il lavoro di D125-D126, **non ancora pubblicato**.
📎 Verbale `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`: **centoventisei** decisioni in
**quarantadue** tornate; la prossima è **D127**.

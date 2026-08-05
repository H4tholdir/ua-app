-- 20260805174500_lavori_tinta.sql — D42, Task 2 di 9.
-- Spec §4.1. NON aggiungere BEGIN;/COMMIT;.
--
-- 🛑 Il nome porta l'orologio (D155), non quello del piano: `20260803140100`
--    sarebbe anteriore alle migration già applicate — v. il ritrovamento P1-②.
ALTER TABLE lavori
  ADD COLUMN tinta_famiglia text,
  ADD COLUMN tinta_codice   text;

-- ① La coppia viaggia intera. Mezza tinta non è mezza tinta: è nessuna tinta.
--    Stessa regola di lavori_colore_caso_coppia_ck.
ALTER TABLE lavori
  ADD CONSTRAINT lavori_tinta_coppia_ck
    CHECK ((tinta_famiglia IS NULL) = (tinta_codice IS NULL));

-- ② La tinta, se c'è, deve esistere davvero nel catalogo — anche quando arriva
--    dall'API e non dalla schermata.
ALTER TABLE lavori
  ADD CONSTRAINT lavori_tinta_fk
    FOREIGN KEY (tinta_famiglia, tinta_codice) REFERENCES tinte_manufatto (famiglia, codice);

-- ③ D111 — LA FAMIGLIA CONTRO IL TIPO, e questo è il vincolo che il panel del
--    28/07 dava per impossibile.
--    Il panel diceva: «l'id fine dei 38 tipi non è persistito, quindi non si può
--    legare una tinta al tipo». Vero per l'id FINE. Ma la divisione resina/sport
--    cade esattamente sulla categoria GROSSA, che su questa riga c'è.
--    `provato:` rileggendo `src/lib/domain/tipi-lavoro.ts` riga per riga il
--    05/08/2026 — non ripreso dal piano:
--      · macro `ortodonzia` con `prevedeColore: 'libero'` → placca_espansione,
--        apparecchio_funzionale. Gli altri due (contenzione, allineatori) sono
--        `'nessuno'`;
--      · macro `bite_splint` con `prevedeColore: 'libero'` → paradenti soltanto.
--        Gli altri tre (bite_michigan, bite_morbido, anti_russamento) `'nessuno'`.
--    Così `('sport','rosso')` sulla riga di una corona è IMPOSSIBILE, non
--    soltanto sconsigliato.
--
--    ⚠️ DUE LIMITI, dichiarati perché nessuno li scopra dopo:
--    (a) il vincolo è LARGO: sa dire «questa tinta non c'entra con l'ortodonzia»,
--        non «la contenzione non ha colore». Quella resta una regola di schermo.
--    (b) è un ACCOPPIAMENTO, non una legge: se un domani un tipo con tinta
--        nascesse sotto un'altra categoria grossa, questa CHECK va rifatta.
ALTER TABLE lavori
  ADD CONSTRAINT lavori_tinta_tipo_ck
    CHECK (
      tinta_famiglia IS NULL
      OR (tinta_famiglia = 'resina_ortodontica' AND tipo_dispositivo = 'ortodonzia')
      OR (tinta_famiglia = 'sport'              AND tipo_dispositivo = 'bite_splint')
    );

COMMENT ON COLUMN lavori.tinta_famiglia IS
  'D42 — famiglia della tinta non dentale. Legata a tipo_dispositivo da lavori_tinta_tipo_ck: accoppiamento, non legge (vedi commento nella migration).';

COMMENT ON COLUMN lavori.tinta_codice IS
  'D42 — codice STABILE della tinta nel catalogo `tinte_manufatto`. Mai mostrato: si mostra `nome`. Viaggia in coppia con tinta_famiglia (lavori_tinta_coppia_ck).';

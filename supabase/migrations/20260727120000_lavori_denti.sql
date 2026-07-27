-- 20260727120000_lavori_denti.sql — Ondata (a) del wizard «Nuovo lavoro», parte 1/4.
-- Spec: docs/superpowers/specs/2026-07-27-wizard-nuovo-lavoro-design.md §8 passi 1-2.
-- NON aggiungere BEGIN;/COMMIT; — il runner Supabase avvolge già la migration.

-- ============ 1. Il vincolo che serve alla FK composita (verbale ⑧) ============
-- Senza questo, `lavori_denti (lavoro_id, laboratorio_id) → lavori (id, laboratorio_id)`
-- non è costruibile, e una riga potrebbe portare il laboratorio B su un lavoro di A.
ALTER TABLE lavori ADD CONSTRAINT lavori_id_lab_uk UNIQUE (id, laboratorio_id);

-- ============ 2. colori_dentali — riferimento NON-tenant ============
-- Non ha laboratorio_id e non ha RLS: è un catalogo pubblico in sola lettura,
-- come lo sono le scale VITA nel mondo reale.
CREATE TABLE colori_dentali (
  scala    text NOT NULL CHECK (scala IN ('vita_classical','vita_3d_master','fuori_scala')),
  codice   text NOT NULL CHECK (char_length(btrim(codice)) BETWEEN 1 AND 8),
  famiglia text NOT NULL,
  ordine   smallint NOT NULL,
  -- ⚠️ hex resta NULL in questa ondata, DELIBERATAMENTE. I valori colorimetrici
  -- pubblicati (Bayindir et al., J Prosthet Dent 2007;98:175-185) servono alla
  -- resa a schermo di W9, che è ondata (b): si popolano leggendo la fonte, non
  -- inventandoli qui. Una tinta inventata su un dispositivo medico non è un
  -- segnaposto innocuo.
  hex      text CHECK (hex IS NULL OR hex ~ '^#[0-9A-Fa-f]{6}$'),
  PRIMARY KEY (scala, codice)
);

-- VITA classical — 16 codici (⑦: sono SEDICI, non 19)
INSERT INTO colori_dentali (scala, codice, famiglia, ordine) VALUES
  ('vita_classical','A1','A',1), ('vita_classical','A2','A',2),
  ('vita_classical','A3','A',3), ('vita_classical','A3.5','A',4),
  ('vita_classical','A4','A',5),
  ('vita_classical','B1','B',6), ('vita_classical','B2','B',7),
  ('vita_classical','B3','B',8), ('vita_classical','B4','B',9),
  ('vita_classical','C1','C',10), ('vita_classical','C2','C',11),
  ('vita_classical','C3','C',12), ('vita_classical','C4','C',13),
  ('vita_classical','D2','D',14), ('vita_classical','D3','D',15),
  ('vita_classical','D4','D',16);

-- Fuori scala — i 3 codici che TabClinica.tsx:8-14 offre già oggi accanto ai 16.
-- Senza queste righe la migrazione dei writer esistenti (Task 12) rifiuterebbe
-- valori che l'app accetta da sempre.
INSERT INTO colori_dentali (scala, codice, famiglia, ordine) VALUES
  ('fuori_scala','T','speciale',1),
  ('fuori_scala','BL','speciale',2),
  ('fuori_scala','OM','speciale',3);

-- VITA 3D-Master — 29 codici. Famiglia = livello di luminosità (0-5), che è
-- l'ordinamento vero della scala: luminosità → croma → tinta, non l'alfabeto.
INSERT INTO colori_dentali (scala, codice, famiglia, ordine) VALUES
  ('vita_3d_master','0M1','0',1), ('vita_3d_master','0M2','0',2), ('vita_3d_master','0M3','0',3),
  ('vita_3d_master','1M1','1',4), ('vita_3d_master','1M2','1',5),
  ('vita_3d_master','2L1.5','2',6), ('vita_3d_master','2L2.5','2',7),
  ('vita_3d_master','2M1','2',8), ('vita_3d_master','2M2','2',9), ('vita_3d_master','2M3','2',10),
  ('vita_3d_master','2R1.5','2',11), ('vita_3d_master','2R2.5','2',12),
  ('vita_3d_master','3L1.5','3',13), ('vita_3d_master','3L2.5','3',14),
  ('vita_3d_master','3M1','3',15), ('vita_3d_master','3M2','3',16), ('vita_3d_master','3M3','3',17),
  ('vita_3d_master','3R1.5','3',18), ('vita_3d_master','3R2.5','3',19),
  ('vita_3d_master','4L1.5','4',20), ('vita_3d_master','4L2.5','4',21),
  ('vita_3d_master','4M1','4',22), ('vita_3d_master','4M2','4',23), ('vita_3d_master','4M3','4',24),
  ('vita_3d_master','4R1.5','4',25), ('vita_3d_master','4R2.5','4',26),
  ('vita_3d_master','5M1','5',27), ('vita_3d_master','5M2','5',28), ('vita_3d_master','5M3','5',29);

-- Catalogo pubblico in sola lettura: nessuno lo scrive dall'applicazione.
REVOKE ALL ON colori_dentali FROM anon, authenticated, service_role;
GRANT SELECT ON colori_dentali TO authenticated, service_role;

COMMENT ON TABLE colori_dentali IS
  'Scale colore dentali (W10). Non-tenant, sola lettura. hex NULL finché i valori colorimetrici pubblicati non vengono importati dalla fonte — ondata (b).';

-- B20: differenzia PSUR (Art. 86) da PMS Report (Art. 85) per classe di
-- rischio del dispositivo. Tabella verificata vuota il 07/07/2026 — NOT
-- NULL senza default sicuro, nessun backfill necessario. Il vincolo UNIQUE
-- passa da "un record per laboratorio/anno" a "un record per
-- laboratorio/anno/gruppo-classe", perché MDR (MDCG 2025-10) richiede
-- documenti distinti e coesistenti per Classe I vs Classe IIa/IIb/III.
-- Rollback non pulito una volta scritte righe multi-gruppo per lo stesso
-- anno — vedi spec §6.

ALTER TABLE psur ADD COLUMN gruppo_classe TEXT NOT NULL
  CHECK (gruppo_classe IN ('classe_i', 'classe_iia', 'classe_iib_iii'));

ALTER TABLE psur DROP CONSTRAINT psur_laboratorio_id_anno_riferimento_key;
ALTER TABLE psur ADD CONSTRAINT psur_lab_anno_gruppo_key
  UNIQUE (laboratorio_id, anno_riferimento, gruppo_classe);

COMMENT ON COLUMN psur.gruppo_classe IS
  'classe_i = PMS Report (Art. 85); classe_iia = PSUR biennale; classe_iib_iii = PSUR annuale (Art. 86)';

-- UÀ — Seed data per sviluppo/test
-- NON eseguire in produzione senza aver prima creato gli utenti in auth.users
-- Richiede: utente con id=b0000000-0000-0000-0000-000000000001 in auth.users

-- SEED DATA — Laboratorio Filippo Opromolla (dati reali anonimizzati)
-- Usare per test e sviluppo
-- ============================================================

BEGIN;

-- 1. Laboratorio
INSERT INTO laboratori (
  id, nome, ragione_sociale, partita_iva, codice_fiscale,
  indirizzo, cap, citta, provincia,
  telefono, email,
  codice_itca, regime_fiscale,
  piano
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Lab. Odontotecnico Filippo Opromolla',
  'Filippo Opromolla',
  '03508740655',
  'PRMFPP69S17Z112Q',
  'via Tempone Siepe Grande snc', '84028', 'Serre', 'SA',
  '3473334094', 'filippopromolla@gmail.com',
  'ITCA01051686', 'RF01',
  'lab'
);

-- 2. Utente titolare
-- Nota: in produzione l'id deve corrispondere a auth.users.id
INSERT INTO utenti (
  id, laboratorio_id, nome, cognome, email, ruolo, sigla
) VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Filippo', 'Opromolla', 'filippopromolla@gmail.com',
  'titolare', 'FO'
);

-- 3. Tecnico (stessa persona del titolare)
INSERT INTO tecnici (
  id, laboratorio_id, utente_id,
  nome, cognome, sigla, qualifica, prrc
) VALUES (
  'c0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'Filippo', 'Opromolla', 'FO',
  'Odontotecnico', TRUE
);

-- 4. Cliente (dentista)
INSERT INTO clienti (
  id, laboratorio_id,
  studio_nome, nome, cognome,
  telefono, email,
  partita_iva, codice_fiscale, codice_sdi,
  indirizzo, cap, citta, provincia,
  listino_numero
) VALUES (
  'd0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Dental Center s.r.l. uninominale',
  'Dino', 'Vicinanza',
  '3381234567', 'vicinanza@example.com',
  '05089210651', '05089210651', 'W7YVjK9',
  'via Nazionale n. 4', '84028', 'Serre', 'SA',
  1
);

-- 5. Paziente
INSERT INTO pazienti (
  id, laboratorio_id, cliente_id,
  nome_cognome, data_nascita, codice_paziente
) VALUES (
  'e0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000001',
  'SCOVOTTO GIUSEPPE', '1975-03-22', 'PAZ-001'
);

-- 6. Listino — una voce di esempio
INSERT INTO listino (
  id, laboratorio_id,
  codice, nome, categoria,
  prezzo_1, prezzo_2, prezzo_3, prezzo_4,
  tipo_dispositivo_mdr, classe_rischio, da_conformare,
  norma_riferimento
) VALUES (
  'f0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'PF001', 'Corona ceramica su moncone', 'protesi_fissa',
  280.00, 250.00, 220.00, 200.00,
  'Corona in zirconia monolitica', 'classe_iia', TRUE,
  'EN ISO 6872:2015'
);

-- 7. Ciclo produzione
INSERT INTO cicli_produzione (
  id, laboratorio_id,
  codice, nome, tipo_dispositivo, classe_rischio
) VALUES (
  'g0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'ZIRCAD', 'Corona in zirconia e ceramica', 'protesi_fissa', 'classe_iia'
);

-- 8. Fasi del ciclo
INSERT INTO fasi_produzione (
  laboratorio_id, ciclo_id, codice_fase, descrizione, ordine, attrezzatura
) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'g0000000-0000-0000-0000-000000000001',
   'OL01', 'RICEVIMENTO IMPRONTE DEI MODELLI, CODIFICA', 1, NULL),
  ('a0000000-0000-0000-0000-000000000001', 'g0000000-0000-0000-0000-000000000001',
   'OL02', 'DISINFEZIONE', 2, NULL),
  ('a0000000-0000-0000-0000-000000000001', 'g0000000-0000-0000-0000-000000000001',
   'OL09', 'ACQUISIZIONE CAD', 9, 'Scanner tridimensionale'),
  ('a0000000-0000-0000-0000-000000000001', 'g0000000-0000-0000-0000-000000000001',
   'OL12', 'FRESATURA CON FRESATRICE A 5 ASSI', 12, 'Fresatrice CNC 5 assi'),
  ('a0000000-0000-0000-0000-000000000001', 'g0000000-0000-0000-0000-000000000001',
   'OL15', 'SINTERIZZAZIONE DELLA ZIRCONIA', 15, 'Forno sinterizzazione');

-- Aggiorna listino con ciclo
UPDATE listino SET ciclo_id = 'g0000000-0000-0000-0000-000000000001'
WHERE id = 'f0000000-0000-0000-0000-000000000001';

-- 9. Lavoro
INSERT INTO lavori (
  id, laboratorio_id,
  numero_lavoro, anno_lavoro,
  cliente_id, paziente_id, tecnico_id, ciclo_id,
  paziente_nome_snapshot, paziente_nascita_snapshot,
  tipo_dispositivo, descrizione,
  classe_rischio, norma_riferimento, da_conformare,
  stato, priorita,
  data_ingresso, data_consegna_prevista,
  listino_id, prezzo_unitario,
  colore_dente
) VALUES (
  'h0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  '2026/0001', 2026,
  'd0000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',
  'g0000000-0000-0000-0000-000000000001',
  'SCOVOTTO GIUSEPPE', '1975-03-22',
  'protesi_fissa', 'Corona ceramica dente 14, colore A2',
  'classe_iia', 'EN ISO 6872:2015', TRUE,
  'consegnato', 'normale',
  '2026-03-13 09:00:00+01', '2026-04-24',
  'f0000000-0000-0000-0000-000000000001', 280.00,
  'A2'
);

-- 10. Riga lavorazione
INSERT INTO lavori_lavorazioni (
  laboratorio_id, lavoro_id, listino_id,
  codice, descrizione, quantita, unita_misura,
  prezzo_unitario, importo, codice_iva, natura_iva, ordine
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'h0000000-0000-0000-0000-000000000001',
  'f0000000-0000-0000-0000-000000000001',
  'PF001', 'Corona ceramica su moncone — dente 14', 1, 'pezzo',
  280.00, 280.00, 'N4', 'N4', 1
);

-- 11. Dichiarazione di Conformità
INSERT INTO dichiarazioni_conformita (
  id, laboratorio_id, lavoro_id,
  numero_ddc, anno_ddc, progressivo_ddc,
  fabbricante_nome, fabbricante_indirizzo, fabbricante_piva, fabbricante_itca,
  prescrittore_nome,
  paziente_nome, paziente_nascita,
  tipo_dispositivo, descrizione_dispositivo,
  materiali_json, colore_dente, denti_coinvolti,
  classe_rischio, regola_classificazione,
  norme_json,
  testo_conformita,
  tecnico_responsabile_id, prrc_nome,
  rischi_json,
  stato
) VALUES (
  'i0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'h0000000-0000-0000-0000-000000000001',
  'DDC-2026-0001', 2026, 1,
  'Filippo Opromolla', 'via Tempone Siepe Grande snc, 84028 Serre (SA)',
  '03508740655', 'ITCA01051686',
  'Dott. Dino Vicinanza',
  'SCOVOTTO GIUSEPPE', '1975-03-22',
  'Corona in zirconia monolitica', 'Corona in zirconia monolitica sul dente 14',
  '[{"nome":"Zirconia IPS e.max CAD","produttore":"Ivoclar","numero_lotto":"L2026001","norma":"EN ISO 6872:2015"}]',
  'A2', ARRAY['14'],
  'classe_iia', 'Allegato VIII, Regola 8',
  '[{"codice":"EN ISO 6872:2015","titolo":"Dental ceramic materials"}]',
  'Il presente dispositivo è un dispositivo su misura ai sensi dell''Art. 2(1)(3) del Regolamento (UE) 2017/745. Il Fabbricante dichiara sotto la propria responsabilità che il dispositivo è conforme ai requisiti generali di sicurezza e prestazione di cui all''Allegato I del Regolamento (UE) 2017/745.',
  'c0000000-0000-0000-0000-000000000001', 'Filippo Opromolla',
  '["Deterioramento della precisione causato dall''usura dei materiali.",
    "Rottura di parti di connessione, saldature ed accessori.",
    "Ingestione di parti componenti che si disinseriscono.",
    "Fenomeni galvanici."]',
  'firmata'
);

-- 12. Fattura
INSERT INTO fatture (
  id, laboratorio_id,
  numero, anno, progressivo, data, tipo_documento,
  cliente_id,
  cliente_denominazione, cliente_piva, cliente_cf,
  cliente_indirizzo, cliente_codice_sdi,
  imponibile, sconto_globale, imponibile_netto,
  iva_percentuale, iva_importo,
  bollo, totale,
  codice_iva, natura_iva, riferimento_normativo,
  formato_trasmissione, stato_sdi,
  pagata
) VALUES (
  'j0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  '2026/0001', 2026, 1, '2026-04-24', 'TD01',
  'd0000000-0000-0000-0000-000000000001',
  'Dental Center s.r.l. uninominale', '05089210651', '05089210651',
  'via Nazionale n. 4, 84028 Serre (SA)', 'W7YVjK9',
  280.00, 0, 280.00,
  0, 0,
  2.00, 282.00,
  'N4', 'N4', 'Art. 10, n. 18) del D.P.R. 26 ottobre 1972, n. 633',
  'FPR12', 'accettata',
  TRUE
);

-- 13. Riga fattura
INSERT INTO fatture_righe (
  laboratorio_id, fattura_id, lavoro_id,
  numero_linea, descrizione,
  quantita, unita_misura, prezzo_unitario, importo,
  aliquota_iva, codice_iva, natura_iva,
  codice_articolo
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'j0000000-0000-0000-0000-000000000001',
  'h0000000-0000-0000-0000-000000000001',
  1, 'Corona ceramica su moncone — dente 14 — Pz. SCOVOTTO G.',
  1, 'PZ', 280.00, 280.00,
  0, 'N4', 'N4',
  'PF001'
);

-- 14. Prima nota automatica
INSERT INTO prima_nota (
  laboratorio_id, data,
  gruppo, sottogruppo,
  entrata, uscita,
  descrizione, modalita_pagamento, riferimento,
  fattura_id
) VALUES (
  'a0000000-0000-0000-0000-000000000001', '2026-04-24',
  'Entrate', 'Fatture clienti',
  282.00, 0,
  'Fattura 2026/0001 — Dental Center Vicinanza', 'bonifico', '2026/0001',
  'j0000000-0000-0000-0000-000000000001'
);

-- Progressivi inizializzati
INSERT INTO progressivi_anno (laboratorio_id, tipo, anno, progressivo) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'lavoro',   2026, 1),
  ('a0000000-0000-0000-0000-000000000001', 'fattura',  2026, 1),
  ('a0000000-0000-0000-0000-000000000001', 'ddc',      2026, 1),
  ('a0000000-0000-0000-0000-000000000001', 'buono',    2026, 0),
  ('a0000000-0000-0000-0000-000000000001', 'ordine',   2026, 0);

COMMIT;

-- Verifica seed
SELECT 'laboratori' AS tabella, COUNT(*) FROM laboratori UNION ALL
SELECT 'utenti', COUNT(*) FROM utenti UNION ALL
SELECT 'tecnici', COUNT(*) FROM tecnici UNION ALL
SELECT 'clienti', COUNT(*) FROM clienti UNION ALL
SELECT 'pazienti', COUNT(*) FROM pazienti UNION ALL
SELECT 'listino', COUNT(*) FROM listino UNION ALL
SELECT 'cicli_produzione', COUNT(*) FROM cicli_produzione UNION ALL
SELECT 'fasi_produzione', COUNT(*) FROM fasi_produzione UNION ALL
SELECT 'lavori', COUNT(*) FROM lavori UNION ALL
SELECT 'dichiarazioni_conformita', COUNT(*) FROM dichiarazioni_conformita UNION ALL
SELECT 'fatture', COUNT(*) FROM fatture UNION ALL
SELECT 'prima_nota', COUNT(*) FROM prima_nota;


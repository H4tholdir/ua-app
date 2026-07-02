-- ============================================================
-- B2 — Dismissione finale lavori_partitario (0 righe, nessun writer).
-- Sicura solo ora: Task 1 ha rimosso le 8 select con join
-- `partitario:lavori_partitario(*)`; lo Step 6 di questo task ha appena
-- riscritto gli ultimi 2 punti applicativi (getPagamentiScadutiTop,
-- getFrontDeskDashboard) che referenziavano la tabella con il pattern
-- `lavori_partitario(importo)`, invisibile al grep usato in Task 1.
-- ============================================================
DROP TABLE IF EXISTS lavori_partitario CASCADE;

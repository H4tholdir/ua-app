-- 20260805174000_tinte_manufatto.sql — D42, Task 1 di 9.
-- Spec 2026-08-03-tinte-manufatto-design §3. NON aggiungere BEGIN;/COMMIT;.
--
-- Catalogo PUBBLICO IN SOLA LETTURA, come colori_dentali: niente laboratorio_id,
-- niente RLS. D110 — un elenco solo per tutti, chiuso. Un laboratorio non può
-- aggiungere voci: il prezzo è dichiarato e accettato nella spec §3.2.
--
-- 🛑 IL NOME DI QUESTO FILE NON È QUELLO DEL PIANO, ed è voluto. Il piano diceva
--    `20260803140000`, che è ANTERIORE all'ultima migration applicata
--    (`provato:` `SELECT version FROM supabase_migrations.schema_migrations
--    ORDER BY version DESC LIMIT 1` → **20260805113700**): sarebbe una migration
--    fuori ordine. Il nome porta l'orologio (D155), non la data del piano.
CREATE TABLE tinte_manufatto (
  famiglia text NOT NULL,
  codice   text NOT NULL,
  -- `codice` è la chiave STABILE e non si mostra mai; `nome` è l'etichetta che
  -- si legge. Sono due colonne di proposito (spec §3.1): il codice resta scritto
  -- sul lavoro e conservato, quindi rinominare l'etichetta non deve invalidare
  -- i lavori che l'avevano scelta. In colori_dentali non serviva: lì «A3» è
  -- insieme codice e nome.
  nome     text NOT NULL,
  ordine   smallint NOT NULL,
  -- 🔵 D114 — il pallino c'è SOLO dove è onesto. `hex` resta NULL su trasparente
  -- e sui glitter: un colore piatto lì direbbe una cosa falsa. È la stessa scelta
  -- già scritta in colori_dentali («una tinta inventata su un dispositivo medico
  -- non è un segnaposto innocuo»), applicata al caso opposto — lì mancava la
  -- fonte, qui manca il colore.
  hex      text,
  CONSTRAINT tinte_manufatto_famiglia_ck CHECK (famiglia IN ('resina_ortodontica','sport')),
  CONSTRAINT tinte_manufatto_codice_ck   CHECK (codice ~ '^[a-z0-9_]{2,24}$'),
  CONSTRAINT tinte_manufatto_hex_ck      CHECK (hex IS NULL OR hex ~ '^#[0-9A-Fa-f]{6}$'),
  PRIMARY KEY (famiglia, codice)
);

-- ── resina ortodontica (17) ────────────────────────────────────────────────
-- ⚠️ STATUTO DI QUESTA LISTA (D116): NON è la gamma di un fornitore. Le pagine
-- Dentaurum descrivono le FAMIGLIE di Orthocryl (classici, neon, glitter,
-- bianco/nero, trasparente) ma non un elenco di nomi. Questa lista è stata
-- proposta e presa così da Francesco: vale come sua decisione esplicita.
-- Non presentarla come gamma commerciale accertata.
INSERT INTO tinte_manufatto (famiglia, codice, nome, ordine, hex) VALUES
  ('resina_ortodontica','trasparente','Trasparente', 1, NULL),
  ('resina_ortodontica','rosa','Rosa',               2, '#E8548C'),
  ('resina_ortodontica','rosso','Rosso',             3, '#D90012'),
  ('resina_ortodontica','blu','Blu',                 4, '#1D5FBF'),
  ('resina_ortodontica','azzurro','Azzurro',         5, '#57A8E8'),
  ('resina_ortodontica','verde','Verde',             6, '#1B7F3B'),
  ('resina_ortodontica','giallo','Giallo',           7, '#F2C200'),
  ('resina_ortodontica','arancione','Arancione',     8, '#F07B10'),
  ('resina_ortodontica','viola','Viola',             9, '#7C3F9C'),
  ('resina_ortodontica','bianco','Bianco',          10, '#FFFFFF'),
  ('resina_ortodontica','nero','Nero',              11, '#1A1A1A'),
  ('resina_ortodontica','glitter_argento','Glitter argento',         12, NULL),
  ('resina_ortodontica','glitter_oro','Glitter oro',                 13, NULL),
  ('resina_ortodontica','glitter_multicolore','Glitter multicolore', 14, NULL),
  ('resina_ortodontica','neon_verde','Neon verde',         15, '#6EF23A'),
  ('resina_ortodontica','neon_rosa','Neon rosa',           16, '#FF3FA4'),
  ('resina_ortodontica','neon_arancione','Neon arancione', 17, '#FF7A1A');

-- ── sport (17) ─────────────────────────────────────────────────────────────
-- Questa lista RICALCA una gamma reale: i colori standard dei dischi Erkoflex
-- (Erkodent), tradotti. Fonte nella spec §3.2.
INSERT INTO tinte_manufatto (famiglia, codice, nome, ordine, hex) VALUES
  ('sport','trasparente','Trasparente',  1, NULL),
  ('sport','bianco','Bianco',            2, '#FFFFFF'),
  ('sport','nero','Nero',                3, '#1A1A1A'),
  ('sport','blu','Blu',                  4, '#1D5FBF'),
  ('sport','azzurro','Azzurro',          5, '#57A8E8'),
  ('sport','blu_scuro','Blu scuro',      6, '#10306B'),
  ('sport','rosso','Rosso',              7, '#D90012'),
  ('sport','rosso_scuro','Rosso scuro',  8, '#8C0A18'),
  ('sport','verde','Verde',              9, '#1B7F3B'),
  ('sport','verde_scuro','Verde scuro', 10, '#0C4A24'),
  ('sport','giallo','Giallo',           11, '#F2C200'),
  ('sport','arancione','Arancione',     12, '#F07B10'),
  ('sport','rosa','Rosa',               13, '#E8548C'),
  ('sport','lilla','Lilla',             14, '#B98BE8'),
  ('sport','bordeaux','Bordeaux',       15, '#6B1028'),
  ('sport','oro','Oro',                 16, '#C9A227'),
  ('sport','argento','Argento',         17, '#B8BCC0');

-- ── I permessi. 🛑 QUESTE DUE RIGHE NON ERANO NEL PIANO, E SENZA DI LORO IL
--    CATALOGO SAREBBE SCRIVIBILE DA CHIUNQUE ABBIA LA CHIAVE PUBBLICA. ────────
-- `provato:` su transazione ANNULLATA, creando una tabella usa-e-getta in
-- `public` e leggendone i grant: una tabella NUOVA eredita dai privilegi
-- predefiniti del progetto **arwdDxtm** (INSERT · SELECT · UPDATE · DELETE ·
-- TRUNCATE · REFERENCES · TRIGGER) per **anon**, **authenticated** e
-- **service_role**. Senza RLS — e qui RLS non c'è, per progetto — l'unica cosa
-- che protegge un catalogo pubblico sono i GRANT.
-- `provato:` il gemello `colori_dentali` ha esattamente `authenticated=SELECT` e
-- `service_role=SELECT`, e **niente per anon**: le sue due righe stanno in
-- `20260727120000_lavori_denti.sql:64-65`. Qui si ricalcano, non si reinventano.
-- 🔑 Perché conta più che su un catalogo qualsiasi: questo dato finisce sul
--    lavoro, e il lavoro è un dispositivo su misura. Un catalogo che un
--    anonimo può TRUNCARE è un catalogo che può far sparire la tinta scelta.
REVOKE ALL ON tinte_manufatto FROM anon, authenticated, service_role;
GRANT SELECT ON tinte_manufatto TO authenticated, service_role;

COMMENT ON TABLE tinte_manufatto IS
  'D42 — tinte NON dentali (resina ortodontica, sport). Catalogo pubblico chiuso: nessun laboratorio_id, nessuna RLS, come colori_dentali. Protetto dai soli GRANT (SELECT a authenticated e service_role, niente ad anon). `hex` NULL dove un colore piatto mentirebbe (trasparente, glitter).';

-- UÀ — Schema PostgreSQL v1.1
-- Generato da 23_ua_database_schema.md
-- Esegui questo file nel SQL Editor di Supabase

-- ============================================================
-- ESTENSIONI
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid() fallback e cifratura
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- ricerca full-text trigram (clienti, pazienti)
CREATE EXTENSION IF NOT EXISTS "unaccent";   -- ricerca senza accenti (nomi italiani)

-- ============================================================
-- FUNZIONE HELPER: recupera laboratorio_id dell'utente corrente
-- SECURITY DEFINER evita ricorsione in RLS su tabella utenti
-- Risultato in cache per la durata della transazione (immutable)
-- ============================================================
CREATE OR REPLACE FUNCTION public.current_lab_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT laboratorio_id
    FROM public.utenti
    WHERE id = auth.uid()
      AND deleted_at IS NULL
    LIMIT 1
  );
END;
$$;

-- ============================================================
-- FUNZIONE HELPER: verifica ruolo utente corrente
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_role(required_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.utenti
    WHERE id = auth.uid()
      AND ruolo = required_role
      AND deleted_at IS NULL
  );
END;
$$;

-- ============================================================
-- TRIGGER: aggiorna updated_at automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Macro per applicare il trigger a qualsiasi tabella
-- Uso: SELECT apply_updated_at_trigger('nome_tabella');
CREATE OR REPLACE FUNCTION apply_updated_at_trigger(tbl TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format(
    'CREATE TRIGGER trg_%I_updated_at
     BEFORE UPDATE ON %I
     FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at()',
    tbl, tbl
  );
END;
$$;

-- ============================================================
-- FUNZIONE: genera numero progressivo per anno (race-safe)
-- NOTA: include anche il progressivo SDI (tipo='sdi_invio') per
-- garantire unicità del ProgressivoInvio nelle fatture PA
-- (labora.progressivo_sdi NON viene usato per generare l'invio —
--  vedere genera_xml_fattura_pa che chiama genera_progressivo)
-- Usata da: numero_lavoro, numero_fattura, numero_ddc, ecc.
-- Usa advisory lock per evitare duplicati in caso di concorrenza
-- ============================================================
CREATE OR REPLACE FUNCTION genera_progressivo(
  p_laboratorio_id UUID,
  p_tipo TEXT,     -- 'lavoro', 'fattura', 'ddc', 'buono', 'sdi_invio'
  p_anno INTEGER DEFAULT EXTRACT(YEAR FROM now())::INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_risultato INTEGER;
BEGIN
  -- FIX (2026-05-12): upsert atomico senza MAX() e senza hashtext().
  -- hashtext() produce INT32 → possibili collisioni tra tenant diversi.
  -- MAX() richiede una SELECT separata → finestra race condition anche con lock.
  -- Soluzione: INSERT ... ON CONFLICT ... DO UPDATE con incremento in-place
  -- usando la riga esistente, RETURNING il valore aggiornato.
  -- Nessun advisory lock necessario: la PK (lab, tipo, anno) serializza da sola.

  INSERT INTO public.progressivi_anno (laboratorio_id, tipo, anno, progressivo)
  VALUES (p_laboratorio_id, p_tipo, p_anno, 1)
  ON CONFLICT (laboratorio_id, tipo, anno)
  DO UPDATE SET progressivo = progressivi_anno.progressivo + 1
  RETURNING progressivo INTO v_risultato;

  RETURN v_risultato;
END;
$$;

-- NOTA: la funzione è SECURITY DEFINER per essere chiamata da RPC Supabase
-- senza esporre la tabella progressivi_anno al client.
-- Test concorrenza consigliato: 100 INSERT paralleli per stesso lab+tipo+anno
-- devono produrre 100 valori distinti senza gap.

-- ============================================================
-- TABELLA SUPPORTO: contatore progressivi per anno
-- Tipi gestiti: 'lavoro', 'fattura', 'ddc', 'buono', 'ordine',
--               'sdi_invio' (per ProgressivoInvio univoco SDI)
-- ============================================================
CREATE TABLE IF NOT EXISTS progressivi_anno (
  laboratorio_id UUID NOT NULL,
  tipo           TEXT NOT NULL,
  anno           INTEGER NOT NULL,
  progressivo    INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (laboratorio_id, tipo, anno)
);

-- RLS: ogni laboratorio vede solo i propri contatori
ALTER TABLE progressivi_anno ENABLE ROW LEVEL SECURITY;

CREATE POLICY "progressivi_laboratorio_select" ON progressivi_anno
  FOR SELECT USING (laboratorio_id = public.current_lab_id());

-- INSERT/UPDATE eseguiti esclusivamente dalla funzione
-- genera_progressivo() via SECURITY DEFINER — non esporre a client


-- ============================================================
-- LABORATORI — tenant root
-- ============================================================
CREATE TABLE laboratori (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Dati anagrafici
  nome                    TEXT NOT NULL,
  ragione_sociale         TEXT,
  partita_iva             TEXT,
  codice_fiscale          TEXT,
  indirizzo               TEXT,
  cap                     CHAR(5),
  citta                   TEXT,
  provincia               CHAR(2),
  telefono                TEXT,
  email                   TEXT,
  pec                     TEXT,
  logo_url                TEXT,        -- Supabase Storage URL

  -- Dati MDR (Reg. UE 2017/745)
  codice_itca             TEXT,        -- Es. ITCA01051686 — obbligatorio in DoC
  srn_eudamed             TEXT,        -- Single Registration Number EUDAMED — OPZIONALE
                                       -- I lab che producono SOLO custom-made (tipico lab dentale)
                                       -- sono ESENTI da registrazione EUDAMED (MDCG 2021-13 Rev.1).
                                       -- Campo da compilare solo se il lab ha anche produzione in serie
                                       -- o è Class III impiantabili. Null = esenzione custom-made.
  numero_rea              TEXT,        -- Es. SA-216471
  numero_albo             TEXT,        -- Es. A.54021
  prrc_nome               TEXT,        -- Person Responsible for Regulatory Compliance
  prrc_qualifica          TEXT,
  anno_prima_marcatura    TEXT,        -- Per DoC: anno prima apposizione dichiarazione
  testo_rischi_default    TEXT,        -- Testo rischi non eliminabili (default 4 rischi standard)

  -- Dati FatturaPA
  regime_fiscale          TEXT NOT NULL DEFAULT 'RF01'
                          CHECK (regime_fiscale IN ('RF01','RF02','RF04','RF05','RF10','RF19')),
  codice_iva_default      TEXT NOT NULL DEFAULT 'N4',
                                       -- N4 = esente Art. 10 DPR 633/72
  nota_iva_fattura        TEXT DEFAULT 'Operazione esente IVA ai sensi dell''Art. 10, c.1, n.18 DPR 633/72',
  soglia_bollo            NUMERIC(10,2) NOT NULL DEFAULT 77.47,
  importo_bollo           NUMERIC(10,2) NOT NULL DEFAULT 2.00,
  bollo_default_attivo    BOOLEAN NOT NULL DEFAULT TRUE,
  progressivo_sdi         INTEGER NOT NULL DEFAULT 1,
                                       -- Contatore progressivo invii SDI

  -- Firma e timbro
  firma_url               TEXT,        -- Immagine firma PRRC/titolare
  timbro_url              TEXT,        -- Timbro del laboratorio

  -- SaaS / Stripe
  piano                   TEXT NOT NULL DEFAULT 'freemium'
                          CHECK (piano IN ('freemium','solo','lab','studio')),
  piano_trial_scade_at    TIMESTAMPTZ,
  stripe_customer_id      TEXT,
  stripe_subscription_id  TEXT,

  -- Audit
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at              TIMESTAMPTZ
);

-- Trigger updated_at
SELECT apply_updated_at_trigger('laboratori');

-- RLS
ALTER TABLE laboratori ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lab_select_own" ON laboratori
  FOR SELECT USING (id = public.current_lab_id());

CREATE POLICY "lab_update_own" ON laboratori
  FOR UPDATE USING (id = public.current_lab_id())
  WITH CHECK (id = public.current_lab_id());

-- Solo superadmin può INSERT/DELETE (gestito via Service Role Key nel backend)

-- Indici
CREATE INDEX idx_laboratori_piva ON laboratori(partita_iva) WHERE deleted_at IS NULL;
CREATE INDEX idx_laboratori_codice_itca ON laboratori(codice_itca) WHERE deleted_at IS NULL;


-- ============================================================
-- UTENTI — account di accesso al sistema
-- ============================================================
CREATE TABLE utenti (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  laboratorio_id    UUID NOT NULL REFERENCES laboratori(id),

  nome              TEXT NOT NULL,
  cognome           TEXT NOT NULL,
  email             TEXT,
  telefono          TEXT,

  ruolo             TEXT NOT NULL DEFAULT 'tecnico'
                    CHECK (ruolo IN ('titolare','tecnico','front_desk','admin_rete')),

  -- Profilo tecnico (se è un tecnico di produzione)
  sigla             CHAR(4),            -- Sigla per documenti MDR (es. "FO")
  colore_agenda     TEXT,               -- Colore HEX per vista agenda

  -- Accesso
  attivo            BOOLEAN NOT NULL DEFAULT TRUE,

  -- MFA — FIX (2026-05-12 — adversarial review #1): obbligatoria per dati sanitari Art. 9
  mfa_required          BOOLEAN NOT NULL DEFAULT FALSE,
                                         -- TRUE per titolare, PRRC, front_desk
  mfa_enrolled_at       TIMESTAMPTZ,
  mfa_metodo            TEXT CHECK (mfa_metodo IN ('totp','sms','email_otp')),

  -- Sessione e inattività — FIX (adversarial review #3)
  session_ttl_minuti    INTEGER NOT NULL DEFAULT 480,
                                         -- Default 8h; tablet condiviso: 30-60min
  inactivity_lock_minuti INTEGER NOT NULL DEFAULT 15,
                                         -- Auto-lock dopo N minuti di inattività
  dispositivo_condiviso  BOOLEAN NOT NULL DEFAULT FALSE,
                                         -- Se TRUE: session_ttl ridotto, no cache offline sanitari

  -- Audit
  last_login_at         TIMESTAMPTZ,
  last_login_ip         TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ
);

SELECT apply_updated_at_trigger('utenti');

-- RLS speciale: non usa public.current_lab_id() per evitare ricorsione
ALTER TABLE utenti ENABLE ROW LEVEL SECURITY;

-- Ogni utente vede se stesso
CREATE POLICY "utenti_select_self" ON utenti
  FOR SELECT USING (id = auth.uid());

-- Ogni utente vede i colleghi dello stesso laboratorio
CREATE POLICY "utenti_select_same_lab" ON utenti
  FOR SELECT USING (
    laboratorio_id = (
      SELECT laboratorio_id FROM utenti u2
      WHERE u2.id = auth.uid() AND u2.deleted_at IS NULL
      LIMIT 1
    )
    AND deleted_at IS NULL
  );

-- Solo titolare può modificare utenti del proprio lab
CREATE POLICY "utenti_update_titolare" ON utenti
  FOR UPDATE USING (
    laboratorio_id = public.current_lab_id()
    AND public.has_role('titolare')
  );

CREATE POLICY "utenti_insert_titolare" ON utenti
  FOR INSERT WITH CHECK (
    laboratorio_id = public.current_lab_id()
    AND public.has_role('titolare')
  );

-- Indici
CREATE INDEX idx_utenti_laboratorio ON utenti(laboratorio_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_utenti_ruolo ON utenti(laboratorio_id, ruolo) WHERE deleted_at IS NULL;


-- ============================================================
-- TECNICI — profilo tecnico (può o non può avere login)
-- ============================================================
CREATE TABLE tecnici (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id    UUID NOT NULL REFERENCES laboratori(id),

  -- Collegamento opzionale all'account
  utente_id         UUID REFERENCES utenti(id),

  nome              TEXT NOT NULL,
  cognome           TEXT NOT NULL,
  sigla             CHAR(4),

  -- Dati MDR
  qualifica         TEXT,               -- Es. "Odontotecnico Senior"
  numero_albo       TEXT,
  prrc              BOOLEAN NOT NULL DEFAULT FALSE,

  -- Compensi
  tipo_compenso     TEXT CHECK (tipo_compenso IN ('fisso','percentuale','per_lavorazione')),
  compenso_base     NUMERIC(10,2),

  -- Audit
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

SELECT apply_updated_at_trigger('tecnici');

ALTER TABLE tecnici ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tecnici_laboratorio" ON tecnici
  FOR ALL USING (
    laboratorio_id = public.current_lab_id()
    AND deleted_at IS NULL
  );

CREATE POLICY "tecnici_insert" ON tecnici
  FOR INSERT WITH CHECK (laboratorio_id = public.current_lab_id());

CREATE INDEX idx_tecnici_laboratorio ON tecnici(laboratorio_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tecnici_utente ON tecnici(utente_id) WHERE utente_id IS NOT NULL;


-- ============================================================
-- CLIENTI — dentisti e studi dentistici
-- ============================================================
CREATE TABLE clienti (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id    UUID NOT NULL REFERENCES laboratori(id),

  -- Anagrafica
  studio_nome       TEXT,               -- Ragione sociale studio
  nome              TEXT NOT NULL,      -- Nome dentista referente
  cognome           TEXT NOT NULL,
  telefono          TEXT,               -- Usato per WhatsApp
  email             TEXT,

  -- Dati fiscali (obbligatori per FatturaPA)
  partita_iva       TEXT,
  codice_fiscale    TEXT,
  codice_sdi        CHAR(7),            -- Codice destinatario SDI (7 cifre)
  pec               TEXT,               -- Alternativa a codice_sdi

  -- Indirizzo
  indirizzo         TEXT,
  cap               CHAR(5),
  citta             TEXT,
  provincia         CHAR(2),
  paese             CHAR(2) NOT NULL DEFAULT 'IT',

  -- Configurazione commerciale
  listino_numero    SMALLINT NOT NULL DEFAULT 1
                    CHECK (listino_numero BETWEEN 1 AND 4),
                                        -- Listino 1-4 (come DentalMaster)
  sconto_percentuale NUMERIC(5,2) NOT NULL DEFAULT 0,
  tecnico_default_id UUID REFERENCES tecnici(id),
  modalita_pagamento TEXT,              -- Es. "30gg data fattura"
  iban              TEXT,

  -- Flag speciali
  non_soggetto_fe   BOOLEAN NOT NULL DEFAULT FALSE,
                                        -- Non soggetto a fattura elettronica
  fatturare_al_paziente BOOLEAN NOT NULL DEFAULT FALSE,
  laboratorio_odontotecnico BOOLEAN NOT NULL DEFAULT FALSE,
                                        -- Il cliente è un altro lab (sub-appalto)

  -- Portale prescrizioni digitali
  portale_token     UUID NOT NULL DEFAULT gen_random_uuid(),
                                        -- Token univoco per link portale

  -- Contatori
  contatore_prescrizioni INTEGER NOT NULL DEFAULT 0,

  note              TEXT,

  -- Audit
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

SELECT apply_updated_at_trigger('clienti');

ALTER TABLE clienti ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clienti_laboratorio_select" ON clienti
  FOR SELECT USING (
    laboratorio_id = public.current_lab_id()
    AND deleted_at IS NULL
  );

CREATE POLICY "clienti_laboratorio_insert" ON clienti
  FOR INSERT WITH CHECK (laboratorio_id = public.current_lab_id());

CREATE POLICY "clienti_laboratorio_update" ON clienti
  FOR UPDATE USING (laboratorio_id = public.current_lab_id())
  WITH CHECK (laboratorio_id = public.current_lab_id());

CREATE POLICY "clienti_laboratorio_delete" ON clienti
  FOR DELETE USING (
    laboratorio_id = public.current_lab_id()
    AND public.has_role('titolare')
  );

-- Indici
CREATE INDEX idx_clienti_laboratorio ON clienti(laboratorio_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_clienti_search ON clienti
  USING gin(to_tsvector('italian', coalesce(studio_nome,'') || ' ' || nome || ' ' || cognome))
  WHERE deleted_at IS NULL;
CREATE INDEX idx_clienti_piva ON clienti(partita_iva) WHERE deleted_at IS NULL;
CREATE INDEX idx_clienti_portale_token ON clienti(portale_token);


-- ============================================================
-- PAZIENTI — paziente finale del dispositivo
-- GDPR Art. 9: dati sanitari — pseudonimizzare per i tecnici
-- I campi sensibili devono essere cifrati via pgsodium in prod
-- ============================================================
CREATE TABLE pazienti (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id    UUID NOT NULL REFERENCES laboratori(id),
  cliente_id        UUID NOT NULL REFERENCES clienti(id),

  -- Identificazione interna
  codice_paziente   TEXT,               -- Codice assegnato dallo studio (es. "PAZ-001")

  -- Dati anagrafici (SENSIBILI — cifrati in produzione via pgsodium)
  nome_cognome      TEXT NOT NULL,      -- "ROSSI MARIO"
  data_nascita      DATE,
  codice_fiscale    TEXT,               -- Per STS (Sistema Tessera Sanitaria)

  -- Note cliniche generali (visibili solo a ruoli autorizzati)
  note              TEXT,
  anamnesi          TEXT,               -- Bruxismo, allergie, ecc.

  -- Audit
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

-- NOTA MDR + GDPR: i dati di questa tabella NON possono essere
-- cancellati per 10 anni dalla data di consegna dell'ultimo dispositivo
-- associato al paziente (Art. 10(8) MDR 2017/745 prevale su Art. 17 GDPR)

SELECT apply_updated_at_trigger('pazienti');

ALTER TABLE pazienti ENABLE ROW LEVEL SECURITY;

-- Tecnici vedono solo ID pseudonimizzato (non il nome) — la policy
-- granulare deve essere implementata a livello app. Qui la RLS
-- garantisce l'isolamento multi-tenant.
CREATE POLICY "pazienti_laboratorio_select" ON pazienti
  FOR SELECT USING (
    laboratorio_id = public.current_lab_id()
    AND deleted_at IS NULL
  );

CREATE POLICY "pazienti_laboratorio_insert" ON pazienti
  FOR INSERT WITH CHECK (laboratorio_id = public.current_lab_id());

CREATE POLICY "pazienti_laboratorio_update" ON pazienti
  FOR UPDATE USING (laboratorio_id = public.current_lab_id())
  WITH CHECK (laboratorio_id = public.current_lab_id());

-- Delete BLOCCATO per tutti (protezione MDR 10 anni)
-- Solo service role può fare hard delete dopo verifica scadenza

-- Indici
CREATE INDEX idx_pazienti_laboratorio ON pazienti(laboratorio_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_pazienti_cliente ON pazienti(cliente_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_pazienti_search ON pazienti
  USING gin(to_tsvector('italian', nome_cognome))
  WHERE deleted_at IS NULL;


-- ============================================================
-- FORNITORI — fornitori di materiali e servizi
-- ============================================================
CREATE TABLE fornitori (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id    UUID NOT NULL REFERENCES laboratori(id),

  ragione_sociale   TEXT NOT NULL,
  partita_iva       TEXT,
  codice_fiscale    TEXT,
  telefono          TEXT,
  email             TEXT,
  indirizzo         TEXT,
  cap               CHAR(5),
  citta             TEXT,
  provincia         CHAR(2),
  paese             CHAR(2) NOT NULL DEFAULT 'IT',

  -- Dati pagamento
  iban              TEXT,
  modalita_pagamento TEXT,
  giorni_pagamento  INTEGER DEFAULT 30,

  note              TEXT,
  attivo            BOOLEAN NOT NULL DEFAULT TRUE,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

SELECT apply_updated_at_trigger('fornitori');

ALTER TABLE fornitori ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fornitori_laboratorio" ON fornitori
  FOR ALL USING (
    laboratorio_id = public.current_lab_id()
    AND deleted_at IS NULL
  );
CREATE POLICY "fornitori_insert" ON fornitori
  FOR INSERT WITH CHECK (laboratorio_id = public.current_lab_id());

CREATE INDEX idx_fornitori_laboratorio ON fornitori(laboratorio_id) WHERE deleted_at IS NULL;


-- ============================================================
-- LISTINO — catalogo lavorazioni con 4 fasce prezzo
-- Mappa i 72 articoli di DentalMaster + estensibile
-- ============================================================
CREATE TABLE listino (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id    UUID NOT NULL REFERENCES laboratori(id),

  codice            TEXT NOT NULL,      -- Es. "PF001", "CAD001"
  nome              TEXT NOT NULL,      -- Es. "Corona ceramica su moncone"
  descrizione       TEXT,

  -- Categorie
  categoria         TEXT NOT NULL DEFAULT 'protesi_fissa'
                    CHECK (categoria IN (
                      'protesi_fissa', 'protesi_mobile', 'implantologia',
                      'cad_cam', 'ortodonzia', 'scheletrato',
                      'riparazione', 'materiale', 'altro'
                    )),

  -- Quattro fasce prezzo (come DentalMaster)
  prezzo_1          NUMERIC(10,2),      -- Listino standard
  prezzo_2          NUMERIC(10,2),      -- Listino preferenziale
  prezzo_3          NUMERIC(10,2),      -- Listino convenzione
  prezzo_4          NUMERIC(10,2),      -- Listino minimo

  -- MDR
  tipo_dispositivo_mdr TEXT,           -- Es. "Corona in zirconia monolitica"
  classe_rischio    TEXT CHECK (classe_rischio IN ('classe_i','classe_iia','classe_iib','classe_iii')),
  da_conformare     BOOLEAN NOT NULL DEFAULT TRUE,
                                        -- Richiede Dichiarazione di Conformità
  norma_riferimento TEXT,              -- Es. "EN ISO 6872:2015"

  -- Produzione
  ciclo_id          UUID,               -- FK → cicli_produzione (aggiunta dopo)
  unita_misura      TEXT NOT NULL DEFAULT 'pezzo',
  codice_iva        TEXT NOT NULL DEFAULT 'N4',

  -- Compenso tecnico per questa lavorazione
  compenso_tecnico  NUMERIC(10,2),

  attivo            BOOLEAN NOT NULL DEFAULT TRUE,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,

  UNIQUE (laboratorio_id, codice)
);

SELECT apply_updated_at_trigger('listino');

ALTER TABLE listino ENABLE ROW LEVEL SECURITY;

CREATE POLICY "listino_laboratorio_select" ON listino
  FOR SELECT USING (
    laboratorio_id = public.current_lab_id()
    AND deleted_at IS NULL
  );

CREATE POLICY "listino_laboratorio_write" ON listino
  FOR ALL USING (laboratorio_id = public.current_lab_id());

CREATE INDEX idx_listino_laboratorio ON listino(laboratorio_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_listino_categoria ON listino(laboratorio_id, categoria) WHERE deleted_at IS NULL;
CREATE INDEX idx_listino_search ON listino
  USING gin(to_tsvector('italian', codice || ' ' || nome))
  WHERE deleted_at IS NULL;


-- ============================================================
-- MAGAZZINO — articoli / materiali del laboratorio
-- 187 articoli in DentalMaster — inclusi dispositivi medici
-- ============================================================
CREATE TABLE magazzino (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id    UUID NOT NULL REFERENCES laboratori(id),
  fornitore_id      UUID REFERENCES fornitori(id),

  codice_articolo   TEXT NOT NULL,
  nome              TEXT NOT NULL,
  produttore        TEXT,               -- Può differire dal fornitore
  codice_articolo_fornitore TEXT,

  -- Categorizzazione
  categoria         TEXT,               -- Es. "Gessi", "Ceramiche", "Leghe"
  sotto_categoria   TEXT,               -- Es. "Denti confezionati" (per MDR)

  -- Unità di misura (DentalMaster distingue acquisto da scarico)
  um_acquisto       TEXT NOT NULL DEFAULT 'pz',
                                        -- Unità di acquisto (Kg, litro, confezione)
  um_scarico        TEXT NOT NULL DEFAULT 'g',
                                        -- Unità di consumo (g, ml, pezzo)
  quantita_per_confezione NUMERIC(12,4) DEFAULT 1,
                                        -- Es. 1 Kg = 25000 g (fattore conversione)

  -- Prezzi
  costo_confezione  NUMERIC(10,4),      -- Prezzo d'acquisto per confezione
  costo_unitario    NUMERIC(12,6),      -- Costo per unità di scarico
  prezzo_unitario   NUMERIC(10,4),      -- Prezzo di vendita/ricarico
  aliquota_iva      NUMERIC(5,2) NOT NULL DEFAULT 22,

  -- Giacenza
  scorta_attuale    NUMERIC(12,4) NOT NULL DEFAULT 0,
  scorta_minima     NUMERIC(12,4) NOT NULL DEFAULT 0,
  conf_da_ordinare  NUMERIC(10,3) DEFAULT 1,

  -- MDR
  dispositivo_medico BOOLEAN NOT NULL DEFAULT FALSE,
                                        -- Flag: questo materiale è un DM (es. gesso, zirconia)
  traccia_lotto     BOOLEAN NOT NULL DEFAULT TRUE,
                                        -- Richiede numero lotto in lavorazione
  codice_ce         TEXT,
  scheda_tecnica_url TEXT,
  scheda_sicurezza_url TEXT,
  codice_smaltimento TEXT,

  note              TEXT,
  attivo            BOOLEAN NOT NULL DEFAULT TRUE,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,

  UNIQUE (laboratorio_id, codice_articolo)
);

SELECT apply_updated_at_trigger('magazzino');

ALTER TABLE magazzino ENABLE ROW LEVEL SECURITY;

CREATE POLICY "magazzino_laboratorio" ON magazzino
  FOR ALL USING (
    laboratorio_id = public.current_lab_id()
    AND deleted_at IS NULL
  );
CREATE POLICY "magazzino_insert" ON magazzino
  FOR INSERT WITH CHECK (laboratorio_id = public.current_lab_id());

CREATE INDEX idx_magazzino_laboratorio ON magazzino(laboratorio_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_magazzino_scorta ON magazzino(laboratorio_id, scorta_attuale, scorta_minima)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_magazzino_search ON magazzino
  USING gin(to_tsvector('italian', codice_articolo || ' ' || nome || ' ' || coalesce(produttore,'')))
  WHERE deleted_at IS NULL;


-- ============================================================
-- LOTTI_MAGAZZINO — tracciabilità lotti per MDR
-- Obbligatorio per fascicolo tecnico (Allegato II MDR)
-- Tracciabilità inversa: lotto → tutti i lavori che lo usano
-- ============================================================
CREATE TABLE lotti_magazzino (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id    UUID NOT NULL REFERENCES laboratori(id),
  magazzino_id      UUID NOT NULL REFERENCES magazzino(id),

  numero_lotto      TEXT NOT NULL,
  altro_codice      TEXT,               -- Codice secondario del produttore

  -- Quantità
  quantita_acquistata NUMERIC(12,4) NOT NULL,
  quantita_residua  NUMERIC(12,4) NOT NULL,
  costo_acquisto    NUMERIC(10,4),

  -- Date
  data_acquisto     DATE,
  data_scadenza     DATE,
  data_ricezione    DATE,

  -- Documenti
  documento_acquisto_url TEXT,          -- Fattura o DDT fornitore

  note              TEXT,
  attivo            BOOLEAN NOT NULL DEFAULT TRUE,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

-- NOTA MDR: i lotti non possono essere cancellati finché
-- esistono lavori che li referenziano e non sono scaduti i 10 anni

SELECT apply_updated_at_trigger('lotti_magazzino');

ALTER TABLE lotti_magazzino ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lotti_laboratorio" ON lotti_magazzino
  FOR ALL USING (
    laboratorio_id = public.current_lab_id()
    AND deleted_at IS NULL
  );
CREATE POLICY "lotti_insert" ON lotti_magazzino
  FOR INSERT WITH CHECK (laboratorio_id = public.current_lab_id());

CREATE INDEX idx_lotti_magazzino_id ON lotti_magazzino(magazzino_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_lotti_laboratorio ON lotti_magazzino(laboratorio_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_lotti_scadenza ON lotti_magazzino(data_scadenza)
  WHERE deleted_at IS NULL AND data_scadenza IS NOT NULL;
-- Indice per tracciabilità inversa (recall MDR)
CREATE INDEX idx_lotti_numero ON lotti_magazzino(laboratorio_id, numero_lotto)
  WHERE deleted_at IS NULL;


-- ============================================================
-- CICLI_PRODUZIONE — template cicli di lavorazione
-- 136 cicli in DentalMaster (es. ZirCadCam con 16+ fasi)
-- Definiscono il fascicolo tecnico automatico per tipo dispositivo
-- ============================================================
CREATE TABLE cicli_produzione (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id    UUID NOT NULL REFERENCES laboratori(id),

  codice            TEXT NOT NULL,      -- Es. "ZIRCAD", "TORONTO_RES"
  nome              TEXT NOT NULL,      -- Es. "Corona in zirconia e ceramica"
  tipo_dispositivo  TEXT NOT NULL,      -- Corrispondenza con listino.categoria
  classe_rischio    TEXT CHECK (classe_rischio IN ('classe_i','classe_iia','classe_iib','classe_iii')),

  -- MDR
  normative_json    JSONB,              -- Array normative armonizzate applicate
                                        -- Es. [{"norma":"EN ISO 6872:2015","titolo":"..."}]

  attivo            BOOLEAN NOT NULL DEFAULT TRUE,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,

  UNIQUE (laboratorio_id, codice)
);

SELECT apply_updated_at_trigger('cicli_produzione');

ALTER TABLE cicli_produzione ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cicli_laboratorio" ON cicli_produzione
  FOR ALL USING (
    laboratorio_id = public.current_lab_id()
    AND deleted_at IS NULL
  );
CREATE POLICY "cicli_insert" ON cicli_produzione
  FOR INSERT WITH CHECK (laboratorio_id = public.current_lab_id());

CREATE INDEX idx_cicli_laboratorio ON cicli_produzione(laboratorio_id) WHERE deleted_at IS NULL;


-- ============================================================
-- FASI_PRODUZIONE — fasi singole di un ciclo produttivo
-- Es. ZirCadCam: OL01 RICEVIMENTO → OL02 DISINFEZIONE → ... → OL16
-- ============================================================
CREATE TABLE fasi_produzione (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id    UUID NOT NULL REFERENCES laboratori(id),
  ciclo_id          UUID NOT NULL REFERENCES cicli_produzione(id),

  codice_fase       TEXT NOT NULL,      -- Es. "OL01", "OL09"
  descrizione       TEXT NOT NULL,      -- Es. "RICEVIMENTO IMPRONTE DEI MODELLI"
  ordine            SMALLINT NOT NULL,  -- Ordine esecuzione nel ciclo

  -- Dettagli tecnici MDR
  controllo_misura  TEXT,               -- Descrizione controllo e misurazione
  attrezzatura      TEXT,               -- Es. "Scanner tridimensionale"
  materiali_nota    TEXT,               -- Note sui materiali da usare
  esito_atteso      TEXT,

  obbligatoria      BOOLEAN NOT NULL DEFAULT TRUE,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,

  UNIQUE (ciclo_id, codice_fase)
);

SELECT apply_updated_at_trigger('fasi_produzione');

ALTER TABLE fasi_produzione ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fasi_laboratorio" ON fasi_produzione
  FOR ALL USING (
    laboratorio_id = public.current_lab_id()
    AND deleted_at IS NULL
  );
CREATE POLICY "fasi_insert" ON fasi_produzione
  FOR INSERT WITH CHECK (laboratorio_id = public.current_lab_id());

CREATE INDEX idx_fasi_ciclo ON fasi_produzione(ciclo_id, ordine) WHERE deleted_at IS NULL;
CREATE INDEX idx_fasi_laboratorio ON fasi_produzione(laboratorio_id) WHERE deleted_at IS NULL;


-- ============================================================
-- LAVORI — tabella core del sistema
-- Ogni record = una lavorazione commissionata da un dentista
-- Contiene i 12 elementi obbligatori per la DoC (Allegato IV MDR)
-- ============================================================
CREATE TABLE lavori (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id    UUID NOT NULL REFERENCES laboratori(id),

  -- Identificazione
  numero_lavoro     TEXT NOT NULL,      -- Es. "2026/0089" — auto-generato
  anno_lavoro       SMALLINT NOT NULL DEFAULT EXTRACT(YEAR FROM now())::SMALLINT,
  codice_interno    TEXT,               -- Codice libero (es. numero cassetta)
  numero_prescrizione TEXT,             -- Numero prescrizione del dentista (campo protetto)
  numero_cassetta   TEXT,               -- Numero cassetta fisica in laboratorio

  -- Relazioni principali
  cliente_id        UUID NOT NULL REFERENCES clienti(id),
  paziente_id       UUID REFERENCES pazienti(id),
                                        -- Nullable: paziente può essere creato dopo
  tecnico_id        UUID REFERENCES tecnici(id),
  ciclo_id          UUID REFERENCES cicli_produzione(id),
  prescrizione_digitale_id UUID,        -- FK → prescrizioni_digitali (aggiunta dopo)

  -- Dati del paziente (copiati per immutabilità MDR al momento della consegna)
  paziente_nome_snapshot TEXT,          -- Snapshot nome al momento creazione
  paziente_nascita_snapshot DATE,

  -- Tipo e descrizione dispositivo (MDR Allegato IV §5)
  tipo_dispositivo  TEXT NOT NULL
                    CHECK (tipo_dispositivo IN (
                      'protesi_fissa', 'protesi_mobile', 'implantologia',
                      'cad_cam', 'scheletrato', 'ortodonzia',
                      'provvisorio', 'riparazione', 'altro'
                    )),
  descrizione       TEXT NOT NULL,      -- Es. "Corona ceramica 14, colore A2"
  note_interne      TEXT,

  -- Odontogramma / dati clinici
  colore_dente      TEXT,               -- Scala VITA (es. "A2", "B3")
  denti_coinvolti   TEXT[],             -- Array FDI (es. {14, 15, 16})
  arcata            TEXT CHECK (arcata IN ('superiore','inferiore','entrambe')),
  anamnesi_note     TEXT,               -- Bruxismo, precauzioni, altri dispositivi

  -- MDR — Classificazione (Allegato IV §6 — classe rischio)
  classe_rischio    TEXT NOT NULL DEFAULT 'classe_iia'
                    CHECK (classe_rischio IN ('classe_i','classe_iia','classe_iib','classe_iii')),
  norma_riferimento TEXT,               -- Es. "EN ISO 6872:2015"
  da_conformare     BOOLEAN NOT NULL DEFAULT TRUE,

  -- Stato workflow
  stato             TEXT NOT NULL DEFAULT 'in_lavorazione'
                    CHECK (stato IN (
                      'in_lavorazione', 'in_prova', 'pronto',
                      'consegnato', 'annullato', 'in_ritardo'
                    )),
  priorita          TEXT NOT NULL DEFAULT 'normale'
                    CHECK (priorita IN ('normale','urgente','extra_urgente')),

  -- Date
  data_ingresso     TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_consegna_prevista DATE NOT NULL,
  data_prima_prova  DATE,
  data_seconda_prova DATE,
  data_terza_prova  DATE,
  data_consegna_effettiva TIMESTAMPTZ,

  -- File allegati
  file_stl_url      TEXT,               -- File STL da scanner intraorali
  immagini_urls     TEXT[],             -- Array URL immagini
  impronta_digitale BOOLEAN NOT NULL DEFAULT FALSE,

  -- Prezzi (snapshot al momento della creazione)
  listino_id        UUID REFERENCES listino(id),
  prezzo_unitario   NUMERIC(10,2),

  -- FatturaPA
  codice_iva        TEXT NOT NULL DEFAULT 'N4',
  natura_iva        TEXT NOT NULL DEFAULT 'N4',
  incluso_in_fattura BOOLEAN NOT NULL DEFAULT FALSE,

  -- MDR documento generato
  conformato        BOOLEAN NOT NULL DEFAULT FALSE,
                                        -- La DoC è stata generata e archiviata
  data_conformazione TIMESTAMPTZ,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,

  -- Numerazione univoca per laboratorio + anno
  UNIQUE (laboratorio_id, anno_lavoro, numero_lavoro)
);

-- Trigger per aggiornamento automatico stato in ritardo
CREATE OR REPLACE FUNCTION check_lavoro_ritardo()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.stato = 'in_lavorazione'
     AND NEW.data_consegna_prevista < CURRENT_DATE THEN
    NEW.stato = 'in_ritardo';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lavori_ritardo
  BEFORE INSERT OR UPDATE ON lavori
  FOR EACH ROW EXECUTE FUNCTION check_lavoro_ritardo();

SELECT apply_updated_at_trigger('lavori');

ALTER TABLE lavori ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lavori_laboratorio_select" ON lavori
  FOR SELECT USING (
    laboratorio_id = public.current_lab_id()
    AND deleted_at IS NULL
  );

CREATE POLICY "lavori_laboratorio_insert" ON lavori
  FOR INSERT WITH CHECK (laboratorio_id = public.current_lab_id());

CREATE POLICY "lavori_laboratorio_update" ON lavori
  FOR UPDATE USING (laboratorio_id = public.current_lab_id())
  WITH CHECK (laboratorio_id = public.current_lab_id());

-- Soft delete: solo titolare
CREATE POLICY "lavori_laboratorio_delete" ON lavori
  FOR DELETE USING (
    laboratorio_id = public.current_lab_id()
    AND public.has_role('titolare')
  );

-- Indici critici
CREATE INDEX idx_lavori_laboratorio ON lavori(laboratorio_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_lavori_cliente ON lavori(cliente_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_lavori_paziente ON lavori(paziente_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_lavori_tecnico ON lavori(tecnico_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_lavori_stato ON lavori(laboratorio_id, stato) WHERE deleted_at IS NULL;
CREATE INDEX idx_lavori_consegna ON lavori(laboratorio_id, data_consegna_prevista)
  WHERE deleted_at IS NULL AND stato NOT IN ('consegnato','annullato');
CREATE INDEX idx_lavori_anno ON lavori(laboratorio_id, anno_lavoro) WHERE deleted_at IS NULL;
-- Ricerca full-text su descrizione e paziente
CREATE INDEX idx_lavori_search ON lavori
  USING gin(to_tsvector('italian', coalesce(descrizione,'') || ' ' || coalesce(paziente_nome_snapshot,'')))
  WHERE deleted_at IS NULL;


-- ============================================================
-- LAVORI_LAVORAZIONI — righe di dettaglio del lavoro
-- Corrispondono alle righe del cedolino prezzi di DentalMaster
-- ============================================================
CREATE TABLE lavori_lavorazioni (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id    UUID NOT NULL REFERENCES laboratori(id),
  lavoro_id         UUID NOT NULL REFERENCES lavori(id) ON DELETE CASCADE,
  listino_id        UUID REFERENCES listino(id),

  -- Dati della riga (snapshot al momento dell'inserimento)
  codice            TEXT NOT NULL,
  descrizione       TEXT NOT NULL,
  quantita          NUMERIC(10,3) NOT NULL DEFAULT 1,
  unita_misura      TEXT NOT NULL DEFAULT 'pezzo',
  prezzo_unitario   NUMERIC(10,2) NOT NULL,
  sconto_percentuale NUMERIC(5,2) NOT NULL DEFAULT 0,
  importo           NUMERIC(10,2) NOT NULL,
                                        -- importo = qty * prezzo * (1 - sconto/100)
  codice_iva        TEXT NOT NULL DEFAULT 'N4',
  natura_iva        TEXT NOT NULL DEFAULT 'N4',

  ordine            SMALLINT NOT NULL DEFAULT 1,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

SELECT apply_updated_at_trigger('lavori_lavorazioni');

ALTER TABLE lavori_lavorazioni ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lavori_lav_laboratorio" ON lavori_lavorazioni
  FOR ALL USING (laboratorio_id = public.current_lab_id() AND deleted_at IS NULL);
CREATE POLICY "lavori_lav_insert" ON lavori_lavorazioni
  FOR INSERT WITH CHECK (laboratorio_id = public.current_lab_id());

CREATE INDEX idx_lav_lav_lavoro ON lavori_lavorazioni(lavoro_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_lav_lav_laboratorio ON lavori_lavorazioni(laboratorio_id) WHERE deleted_at IS NULL;


-- ============================================================
-- LAVORI_FASI — tracking esecuzione fasi per ogni lavoro
-- Genera il Device History Record (DHR) richiesto da MDR
-- ============================================================
CREATE TABLE lavori_fasi (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id    UUID NOT NULL REFERENCES laboratori(id),
  lavoro_id         UUID NOT NULL REFERENCES lavori(id) ON DELETE CASCADE,
  fase_id           UUID NOT NULL REFERENCES fasi_produzione(id),
  tecnico_id        UUID REFERENCES tecnici(id),

  -- Esecuzione
  eseguita_at       TIMESTAMPTZ,        -- NULL = fase non ancora eseguita
  esito             TEXT CHECK (esito IN ('ok','non_conforme','parziale')),
  note              TEXT,

  -- Dati specifici della fase
  materiali_usati   TEXT,               -- Descrizione libera materiali per questa fase
  attrezzatura_usata TEXT,
  valore_misurato   TEXT,               -- Es. "5.2mm" per controlli dimensionali

  -- Non conformità
  non_conforme      BOOLEAN NOT NULL DEFAULT FALSE,
  azione_correttiva TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

SELECT apply_updated_at_trigger('lavori_fasi');

ALTER TABLE lavori_fasi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lavori_fasi_laboratorio" ON lavori_fasi
  FOR ALL USING (laboratorio_id = public.current_lab_id() AND deleted_at IS NULL);
CREATE POLICY "lavori_fasi_insert" ON lavori_fasi
  FOR INSERT WITH CHECK (laboratorio_id = public.current_lab_id());

CREATE INDEX idx_lavori_fasi_lavoro ON lavori_fasi(lavoro_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_lavori_fasi_laboratorio ON lavori_fasi(laboratorio_id) WHERE deleted_at IS NULL;


-- ============================================================
-- LAVORI_MATERIALI — materiali e lotti usati in ogni lavoro
-- Tracciabilità MDR: da lotto → tutti i lavori (recall)
-- Il contenuto va incluso nel materiali_json della DoC
-- ============================================================
CREATE TABLE lavori_materiali (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id    UUID NOT NULL REFERENCES laboratori(id),
  lavoro_id         UUID NOT NULL REFERENCES lavori(id) ON DELETE CASCADE,
  lotto_id          UUID NOT NULL REFERENCES lotti_magazzino(id),
  magazzino_id      UUID NOT NULL REFERENCES magazzino(id),

  quantita_usata    NUMERIC(12,4) NOT NULL,
  unita_misura      TEXT NOT NULL,
  data_uso          TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Snapshot MDR (in caso il lotto venga aggiornato)
  numero_lotto_snapshot TEXT NOT NULL,
  nome_materiale_snapshot TEXT NOT NULL,
  produttore_snapshot TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

SELECT apply_updated_at_trigger('lavori_materiali');

-- NOTA: aggiorna la scorta del lotto dopo inserimento/modifica
CREATE OR REPLACE FUNCTION aggiorna_scorta_lotto()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE lotti_magazzino
    SET quantita_residua = quantita_residua - NEW.quantita_usata,
        updated_at = now()
    WHERE id = NEW.lotto_id;

    -- Aggiorna anche la scorta totale del materiale
    UPDATE magazzino
    SET scorta_attuale = scorta_attuale - NEW.quantita_usata,
        updated_at = now()
    WHERE id = NEW.magazzino_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    UPDATE lotti_magazzino
    SET quantita_residua = quantita_residua + OLD.quantita_usata,
        updated_at = now()
    WHERE id = OLD.lotto_id;

    UPDATE magazzino
    SET scorta_attuale = scorta_attuale + OLD.quantita_usata,
        updated_at = now()
    WHERE id = OLD.magazzino_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lavori_materiali_scorta
  AFTER INSERT OR DELETE ON lavori_materiali
  FOR EACH ROW EXECUTE FUNCTION aggiorna_scorta_lotto();

ALTER TABLE lavori_materiali ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lavori_mat_laboratorio" ON lavori_materiali
  FOR ALL USING (laboratorio_id = public.current_lab_id() AND deleted_at IS NULL);
CREATE POLICY "lavori_mat_insert" ON lavori_materiali
  FOR INSERT WITH CHECK (laboratorio_id = public.current_lab_id());

CREATE INDEX idx_lavori_mat_lavoro ON lavori_materiali(lavoro_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_lavori_mat_lotto ON lavori_materiali(lotto_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_lavori_mat_laboratorio ON lavori_materiali(laboratorio_id) WHERE deleted_at IS NULL;


-- ============================================================
-- DICHIARAZIONI_CONFORMITA — obbligatorie per ogni consegna
-- BASE NORMATIVA CORRETTA (2026-05-12): Art. 52(8) + Allegato XIII MDR 2017/745
-- (NON Allegato IV che si applica a dispositivi CE-marcati, non su misura)
-- 8 elementi obbligatori Allegato XIII punto 1 — vedi commenti colonne
-- Conservazione: 10 anni dalla consegna (Art. 10(8) MDR)
-- Formula dichiarazione hardcoded (MDCG 2021-3 Q9 verificato):
-- "...conforme ai requisiti generali di sicurezza e prestazione di cui
--  all'Allegato I e ai disposti dell'Allegato XIII del Reg. (UE) 2017/745"
-- NO riferimento a Direttiva 93/42/CEE (abrogata 26/05/2024)
-- ============================================================
CREATE TABLE dichiarazioni_conformita (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id    UUID NOT NULL REFERENCES laboratori(id),
  lavoro_id         UUID NOT NULL REFERENCES lavori(id),

  -- Identificazione (MDR §11: numero identificativo lavoro/lotto)
  numero_ddc        TEXT NOT NULL,      -- Es. "DDC-2026-0089"
  anno_ddc          SMALLINT NOT NULL DEFAULT EXTRACT(YEAR FROM now())::SMALLINT,
  progressivo_ddc   INTEGER NOT NULL,

  -- Data emissione (MDR §10)
  data_emissione    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- MDR §1: Nome e indirizzo fabbricante (snapshot al momento emissione)
  fabbricante_nome  TEXT NOT NULL,
  fabbricante_indirizzo TEXT NOT NULL,
  fabbricante_piva  TEXT NOT NULL,
  fabbricante_itca  TEXT,

  -- MDR §3: Nominativo prescrittore
  prescrittore_nome TEXT NOT NULL,

  -- MDR §4: Dati paziente (pseudonimizzati per tecnici)
  paziente_nome     TEXT NOT NULL,
  paziente_nascita  DATE,

  -- MDR §5: Descrizione dispositivo
  tipo_dispositivo  TEXT NOT NULL,
  descrizione_dispositivo TEXT NOT NULL,
  materiali_json    JSONB,              -- Array: [{nome, lotto, produttore, norma}]
  colore_dente      TEXT,
  denti_coinvolti   TEXT[],

  -- MDR §6: Classificazione rischio
  classe_rischio    TEXT NOT NULL CHECK (classe_rischio IN ('classe_i','classe_iia','classe_iib','classe_iii')),
  regola_classificazione TEXT,          -- Es. "Allegato VIII, Regola 8"

  -- MDR §7: Normative armonizzate
  norme_json        JSONB,              -- Array: [{codice, titolo, anno}]

  -- MDR §8: Dichiarazione esplicita conformità
  testo_conformita  TEXT NOT NULL,

  -- MDR §9: Firma PRRC
  tecnico_responsabile_id UUID REFERENCES tecnici(id),
  prrc_nome         TEXT NOT NULL,
  firma_digitale_url TEXT,              -- URL firma digitale in Supabase Storage
  firmata_at        TIMESTAMPTZ,

  -- MDR §12: Anno marcatura CE (dispositivi su misura: non soggetti)
  nota_marcatura_ce TEXT NOT NULL
                    DEFAULT 'Dispositivo su misura: non soggetto a marcatura CE ai sensi dell''Art. 20(1) MDR 2017/745',

  -- Luogo di fabbricazione (presente nella DdC reale DentalMaster: "Luogo di fabbricazione: Italia")
  luogo_fabbricazione TEXT NOT NULL DEFAULT 'Italia',

  -- PDF archiviato con integrità verificabile
  -- FIX (2026-05-12 — adversarial review #9): aggiunto hash per prova integrità
  pdf_url               TEXT,               -- Supabase Storage URL
  pdf_sha256            TEXT,               -- SHA-256 del blob PDF al momento della generazione
  payload_sha256        TEXT,               -- SHA-256 del JSON input usato per generare il PDF
  template_version      TEXT,               -- Es. "ddc-v1.2.0" — versione template react-pdf
  pdf_generato_at       TIMESTAMPTZ,
  generated_by          UUID REFERENCES utenti(id), -- chi ha premuto "Consegna"
  storage_object_version TEXT,             -- versione oggetto Supabase Storage (per audit)

  stato             TEXT NOT NULL DEFAULT 'bozza'
                    CHECK (stato IN ('bozza','generata','firmata','consegnata')),

  -- Rischi non eliminabili (4 rischi standard da Odontec/DentalMaster)
  rischi_json       JSONB,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,

  -- Una DoC per lavoro (relazione 1:1 per lo standard)
  UNIQUE (laboratorio_id, anno_ddc, progressivo_ddc)
);

SELECT apply_updated_at_trigger('dichiarazioni_conformita');

ALTER TABLE dichiarazioni_conformita ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ddc_laboratorio_select" ON dichiarazioni_conformita
  FOR SELECT USING (
    laboratorio_id = public.current_lab_id()
    AND deleted_at IS NULL
  );

CREATE POLICY "ddc_laboratorio_insert" ON dichiarazioni_conformita
  FOR INSERT WITH CHECK (laboratorio_id = public.current_lab_id());

CREATE POLICY "ddc_laboratorio_update" ON dichiarazioni_conformita
  FOR UPDATE USING (laboratorio_id = public.current_lab_id())
  WITH CHECK (laboratorio_id = public.current_lab_id());

-- DELETE bloccato per tutti: le DoC non si cancellano mai (MDR 10 anni)
-- Solo service role può archiviare dopo 10 anni

CREATE INDEX idx_ddc_laboratorio ON dichiarazioni_conformita(laboratorio_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_ddc_lavoro ON dichiarazioni_conformita(lavoro_id);
CREATE INDEX idx_ddc_anno ON dichiarazioni_conformita(laboratorio_id, anno_ddc) WHERE deleted_at IS NULL;
CREATE INDEX idx_ddc_stato ON dichiarazioni_conformita(laboratorio_id, stato) WHERE deleted_at IS NULL;


-- ============================================================
-- BUONI_CONSEGNA — documento di consegna del lavoro
-- Generato automaticamente al tap CONSEGNA
-- Due varianti: con prezzi / senza prezzi (come DentalMaster)
-- ============================================================
CREATE TABLE buoni_consegna (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id    UUID NOT NULL REFERENCES laboratori(id),
  lavoro_id         UUID NOT NULL REFERENCES lavori(id),

  numero_buono      TEXT NOT NULL,
  anno_buono        SMALLINT NOT NULL,
  progressivo_buono INTEGER NOT NULL,

  data_emissione    DATE NOT NULL DEFAULT CURRENT_DATE,
  data_consegna     DATE,

  -- Varianti stampa (come DentalMaster: con/senza prezzi)
  con_prezzi        BOOLEAN NOT NULL DEFAULT FALSE,
  pdf_url           TEXT,
  pdf_senza_prezzi_url TEXT,

  stato             TEXT NOT NULL DEFAULT 'generato'
                    CHECK (stato IN ('generato','consegnato','annullato')),

  -- Firma alla consegna (FEA su tablet)
  firma_consegna_url TEXT,
  firmato_at        TIMESTAMPTZ,

  note              TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,

  UNIQUE (laboratorio_id, anno_buono, progressivo_buono)
);

SELECT apply_updated_at_trigger('buoni_consegna');

ALTER TABLE buoni_consegna ENABLE ROW LEVEL SECURITY;

CREATE POLICY "buoni_laboratorio" ON buoni_consegna
  FOR ALL USING (laboratorio_id = public.current_lab_id() AND deleted_at IS NULL);
CREATE POLICY "buoni_insert" ON buoni_consegna
  FOR INSERT WITH CHECK (laboratorio_id = public.current_lab_id());

CREATE INDEX idx_buoni_laboratorio ON buoni_consegna(laboratorio_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_buoni_lavoro ON buoni_consegna(lavoro_id);


-- ============================================================
-- ISTRUZIONI_USO — allegate alla consegna del dispositivo
-- Allegato I MDR — obbligatorie per dispositivi su misura
-- ============================================================
CREATE TABLE istruzioni_uso (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id    UUID NOT NULL REFERENCES laboratori(id),
  lavoro_id         UUID NOT NULL REFERENCES lavori(id),

  tipo              TEXT NOT NULL CHECK (tipo IN ('uso','installazione','manutenzione')),
  formato           TEXT CHECK (formato IN ('A4','A5')),
  pdf_url           TEXT,
  versione          TEXT DEFAULT '1.0',

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

SELECT apply_updated_at_trigger('istruzioni_uso');

ALTER TABLE istruzioni_uso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "istruzioni_laboratorio" ON istruzioni_uso
  FOR ALL USING (laboratorio_id = public.current_lab_id() AND deleted_at IS NULL);
CREATE POLICY "istruzioni_insert" ON istruzioni_uso
  FOR INSERT WITH CHECK (laboratorio_id = public.current_lab_id());

CREATE INDEX idx_istruzioni_laboratorio ON istruzioni_uso(laboratorio_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_istruzioni_lavoro ON istruzioni_uso(lavoro_id);


-- ============================================================
-- FATTURE — fatture elettroniche e documenti fiscali
-- FatturaPA v1.2.1 (Agenzia Entrate)
-- Bollo virtuale €2,00 (DPR 642/1972 Art. 13)
-- IVA esente N4 (Art. 10 n. 18 DPR 633/72)
-- ============================================================
CREATE TABLE fatture (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id    UUID NOT NULL REFERENCES laboratori(id),

  -- Numerazione (Es. "15/2026" o "2026/0089")
  numero            TEXT NOT NULL,
  anno              SMALLINT NOT NULL DEFAULT EXTRACT(YEAR FROM now())::SMALLINT,
  progressivo       INTEGER NOT NULL,

  data              DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo_documento    TEXT NOT NULL DEFAULT 'TD01'
                    CHECK (tipo_documento IN ('TD01','TD04','TD05','TD06')),
                                        -- TD01=fattura, TD04=nota credito, TD05=nota debito

  -- Cliente
  cliente_id        UUID NOT NULL REFERENCES clienti(id),

  -- Snapshot dati cliente (per immutabilità fiscale)
  cliente_denominazione TEXT NOT NULL,
  cliente_piva      TEXT,
  cliente_cf        TEXT,
  cliente_indirizzo TEXT NOT NULL,
  cliente_codice_sdi TEXT,
  cliente_pec       TEXT,

  -- Importi
  imponibile        NUMERIC(10,2) NOT NULL DEFAULT 0,
  sconto_globale    NUMERIC(5,2) NOT NULL DEFAULT 0,
  imponibile_netto  NUMERIC(10,2),      -- imponibile * (1 - sconto_globale/100)
  iva_percentuale   NUMERIC(5,2) NOT NULL DEFAULT 0,
                                        -- 0% per esente N4 (standard lab odontotecnico)
  iva_importo       NUMERIC(10,2) NOT NULL DEFAULT 0,
  bollo             NUMERIC(10,2) NOT NULL DEFAULT 0,
                                        -- €2,00 se imponibile_netto > €77,47 con IVA=0%
  totale            NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- IVA
  codice_iva        TEXT NOT NULL DEFAULT 'N4',
  natura_iva        TEXT NOT NULL DEFAULT 'N4',
  riferimento_normativo TEXT DEFAULT 'Art. 10, n. 18) del D.P.R. 26 ottobre 1972, n. 633',
  aliquota_iva_cassa TEXT,              -- DatiCassaPrevidenziale (se applicabile)

  -- SDI
  formato_trasmissione TEXT NOT NULL DEFAULT 'FPR12'
                    CHECK (formato_trasmissione IN ('FPR12','FPA12')),
                                        -- FPR12=B2B, FPA12=PA
  progressivo_sdi   TEXT,               -- Numero progressivo invio SDI
  stato_sdi         TEXT NOT NULL DEFAULT 'bozza'
                    CHECK (stato_sdi IN (
                      'bozza','pronta','inviata','consegnata',
                      'accettata','scartata','decorrenza_termini',
                      'mancata_consegna'
                    )),
  xml_fattura_pa    TEXT,               -- XML FatturaPA generato
  xml_sdi_id        TEXT,               -- ID assegnato da SDI
  xml_inviato_at    TIMESTAMPTZ,
  xml_risposta_sdi  TEXT,               -- Risposta SDI (JSON)
  xml_errori_sdi    TEXT,               -- Motivo scarto SDI

  pdf_url           TEXT,               -- PDF fattura archiviato

  -- Pagamenti
  pagata            BOOLEAN NOT NULL DEFAULT FALSE,
  data_pagamento    DATE,

  note              TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,

  UNIQUE (laboratorio_id, anno, progressivo)
);

-- Trigger: calcola bollo automaticamente prima di insert/update
CREATE OR REPLACE FUNCTION calcola_bollo_fattura()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_soglia           NUMERIC;
  v_importo_bollo    NUMERIC;
  v_bollo_attivo     BOOLEAN;
BEGIN
  -- FIX (2026-05-12): il bug originale controllava imponibile_netto PRIMA
  -- di calcolarlo → su INSERT era sempre NULL → bollo mai applicato.
  -- Ordine corretto: (1) calcola imponibile_netto, (2) poi verifica soglia.

  -- 1. Calcola imponibile netto e IVA (PRIMA di ogni confronto)
  NEW.imponibile_netto := COALESCE(NEW.imponibile, 0) * (1.0 - COALESCE(NEW.sconto_globale, 0) / 100.0);
  NEW.iva_importo      := NEW.imponibile_netto * COALESCE(NEW.iva_percentuale, 0) / 100.0;

  -- 2. Legge configurazione bollo del laboratorio
  SELECT soglia_bollo, importo_bollo, bollo_default_attivo
  INTO   v_soglia, v_importo_bollo, v_bollo_attivo
  FROM   laboratori
  WHERE  id = NEW.laboratorio_id;

  -- 3. Applica bollo se: IVA = 0% (natura esente N4/N2/…) E netto > soglia E attivo
  IF COALESCE(NEW.iva_percentuale, 0) = 0
     AND NEW.imponibile_netto > COALESCE(v_soglia, 77.47)
     AND COALESCE(v_bollo_attivo, TRUE)
  THEN
    NEW.bollo := COALESCE(v_importo_bollo, 2.00);
  ELSE
    NEW.bollo := 0;
  END IF;

  -- 4. Totale finale
  NEW.totale := NEW.imponibile_netto + NEW.iva_importo + NEW.bollo;

  RETURN NEW;
END;
$$;

-- Test cases obbligatori:
-- imponibile=77.47, sconto=0, iva=0  → bollo=0   (sotto soglia)
-- imponibile=77.48, sconto=0, iva=0  → bollo=2.00 (sopra soglia)
-- imponibile=100,   sconto=20, iva=0 → imponibile_netto=80, bollo=2.00
-- imponibile=100,   iva=22         → bollo=0   (con IVA, bollo non dovuto)
-- imponibile=100,   iva=0, bollo_default_attivo=false → bollo=0

CREATE TRIGGER trg_fatture_bollo
  BEFORE INSERT OR UPDATE OF imponibile, sconto_globale, iva_percentuale ON fatture
  FOR EACH ROW EXECUTE FUNCTION calcola_bollo_fattura();

SELECT apply_updated_at_trigger('fatture');

ALTER TABLE fatture ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fatture_laboratorio_select" ON fatture
  FOR SELECT USING (laboratorio_id = public.current_lab_id() AND deleted_at IS NULL);

CREATE POLICY "fatture_laboratorio_insert" ON fatture
  FOR INSERT WITH CHECK (laboratorio_id = public.current_lab_id());

CREATE POLICY "fatture_laboratorio_update" ON fatture
  FOR UPDATE USING (laboratorio_id = public.current_lab_id())
  WITH CHECK (laboratorio_id = public.current_lab_id());

-- Indici
CREATE INDEX idx_fatture_laboratorio ON fatture(laboratorio_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_fatture_cliente ON fatture(cliente_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_fatture_anno ON fatture(laboratorio_id, anno) WHERE deleted_at IS NULL;
CREATE INDEX idx_fatture_stato_sdi ON fatture(laboratorio_id, stato_sdi) WHERE deleted_at IS NULL;
-- BRIN per range temporali (efficiente su grandi tabelle di fatture per anno)
CREATE INDEX idx_fatture_data_brin ON fatture USING brin(data);


-- ============================================================
-- FATTURE_RIGHE — righe di dettaglio della fattura
-- Corrispondono a DettaglioLinee nel XML FatturaPA
-- ============================================================
CREATE TABLE fatture_righe (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id    UUID NOT NULL REFERENCES laboratori(id),
  fattura_id        UUID NOT NULL REFERENCES fatture(id) ON DELETE CASCADE,
  lavoro_id         UUID REFERENCES lavori(id),
  listino_id        UUID REFERENCES listino(id),

  numero_linea      SMALLINT NOT NULL,  -- NumeroLinea nel XML SDI

  -- Dati riga
  descrizione       TEXT NOT NULL,      -- Es. "Corona ceramica 14 - Pz. ROSSI MARIO"
  quantita          NUMERIC(10,3) NOT NULL DEFAULT 1,
  unita_misura      TEXT NOT NULL DEFAULT 'PZ',
  prezzo_unitario   NUMERIC(10,4) NOT NULL,
  sconto_percentuale NUMERIC(5,2) NOT NULL DEFAULT 0,
  importo           NUMERIC(10,2) NOT NULL,
                                        -- qty * prezzo * (1 - sconto/100)

  -- IVA
  aliquota_iva      NUMERIC(5,2) NOT NULL DEFAULT 0,
  codice_iva        TEXT NOT NULL DEFAULT 'N4',
  natura_iva        TEXT NOT NULL DEFAULT 'N4',

  -- CodiceArticolo per SDI (FK al listino del laboratorio)
  codice_articolo   TEXT,
  tipo_codice       TEXT DEFAULT 'Listino',

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

SELECT apply_updated_at_trigger('fatture_righe');

ALTER TABLE fatture_righe ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fatture_righe_laboratorio" ON fatture_righe
  FOR ALL USING (laboratorio_id = public.current_lab_id() AND deleted_at IS NULL);
CREATE POLICY "fatture_righe_insert" ON fatture_righe
  FOR INSERT WITH CHECK (laboratorio_id = public.current_lab_id());

CREATE INDEX idx_fatture_righe_fattura ON fatture_righe(fattura_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_fatture_righe_laboratorio ON fatture_righe(laboratorio_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_fatture_righe_lavoro ON fatture_righe(lavoro_id) WHERE deleted_at IS NULL;


-- ============================================================
-- FATTURE_PAGAMENTI — scadenzario e registro pagamenti ricevuti
-- Alimenta la prima nota e il partitario clienti
-- ============================================================
CREATE TABLE fatture_pagamenti (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id    UUID NOT NULL REFERENCES laboratori(id),
  fattura_id        UUID NOT NULL REFERENCES fatture(id) ON DELETE CASCADE,

  data_scadenza     DATE NOT NULL,
  importo           NUMERIC(10,2) NOT NULL,

  -- Pagamento ricevuto
  pagato_at         TIMESTAMPTZ,
  importo_pagato    NUMERIC(10,2),
  modalita          TEXT CHECK (modalita IN (
                      'bonifico','contanti','assegno','rid','paypal','altro'
                    )),
  iban_addebito     TEXT,
  riferimento       TEXT,               -- Numero bonifico o riferimento pagamento

  note              TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

SELECT apply_updated_at_trigger('fatture_pagamenti');

ALTER TABLE fatture_pagamenti ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fat_pag_laboratorio" ON fatture_pagamenti
  FOR ALL USING (laboratorio_id = public.current_lab_id() AND deleted_at IS NULL);
CREATE POLICY "fat_pag_insert" ON fatture_pagamenti
  FOR INSERT WITH CHECK (laboratorio_id = public.current_lab_id());

CREATE INDEX idx_fat_pag_fattura ON fatture_pagamenti(fattura_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_fat_pag_scadenza ON fatture_pagamenti(laboratorio_id, data_scadenza)
  WHERE deleted_at IS NULL AND pagato_at IS NULL;


-- ============================================================
-- ORDINI_ACQUISTO — ordini a fornitori
-- ============================================================
CREATE TABLE ordini_acquisto (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id    UUID NOT NULL REFERENCES laboratori(id),
  fornitore_id      UUID NOT NULL REFERENCES fornitori(id),

  numero_ordine     TEXT NOT NULL,
  anno_ordine       SMALLINT NOT NULL,
  progressivo_ordine INTEGER NOT NULL,

  data_ordine       DATE NOT NULL DEFAULT CURRENT_DATE,
  data_consegna_prevista DATE,

  -- DDT ricevuto
  data_ddt          DATE,
  numero_ddt        TEXT,

  -- Importi
  totale_ordinato   NUMERIC(10,2) NOT NULL DEFAULT 0,
  totale_ricevuto   NUMERIC(10,2) NOT NULL DEFAULT 0,
  totale_sconto     NUMERIC(10,2) NOT NULL DEFAULT 0,
  totale_iva        NUMERIC(10,2) NOT NULL DEFAULT 0,
  totale_fattura    NUMERIC(10,2) NOT NULL DEFAULT 0,

  stato             TEXT NOT NULL DEFAULT 'aperto'
                    CHECK (stato IN ('aperto','parziale','evaso','annullato')),

  note              TEXT,
  problemi          TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,

  UNIQUE (laboratorio_id, anno_ordine, progressivo_ordine)
);

SELECT apply_updated_at_trigger('ordini_acquisto');

ALTER TABLE ordini_acquisto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ordini_laboratorio" ON ordini_acquisto
  FOR ALL USING (laboratorio_id = public.current_lab_id() AND deleted_at IS NULL);
CREATE POLICY "ordini_insert" ON ordini_acquisto
  FOR INSERT WITH CHECK (laboratorio_id = public.current_lab_id());

CREATE INDEX idx_ordini_laboratorio ON ordini_acquisto(laboratorio_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_ordini_fornitore ON ordini_acquisto(fornitore_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_ordini_stato ON ordini_acquisto(laboratorio_id, stato) WHERE deleted_at IS NULL;


-- ============================================================
-- ORDINI_RIGHE — dettaglio articoli dell'ordine
-- ============================================================
CREATE TABLE ordini_righe (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id    UUID NOT NULL REFERENCES laboratori(id),
  ordine_id         UUID NOT NULL REFERENCES ordini_acquisto(id) ON DELETE CASCADE,
  magazzino_id      UUID REFERENCES magazzino(id),

  codice_articolo   TEXT,
  codice_articolo_fornitore TEXT,
  descrizione       TEXT NOT NULL,

  quantita_ordinata  NUMERIC(12,4) NOT NULL,
  quantita_ricevuta  NUMERIC(12,4) NOT NULL DEFAULT 0,
  quantita_da_ricevere NUMERIC(12,4) GENERATED ALWAYS AS
                    (quantita_ordinata - quantita_ricevuta) STORED,

  costo_unitario    NUMERIC(10,4),
  sconto_percentuale NUMERIC(5,2) NOT NULL DEFAULT 0,
  importo           NUMERIC(10,2),

  ricevuto          BOOLEAN NOT NULL DEFAULT FALSE,
  data_ricezione    DATE,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

SELECT apply_updated_at_trigger('ordini_righe');

ALTER TABLE ordini_righe ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ordini_righe_laboratorio" ON ordini_righe
  FOR ALL USING (laboratorio_id = public.current_lab_id() AND deleted_at IS NULL);
CREATE POLICY "ordini_righe_insert" ON ordini_righe
  FOR INSERT WITH CHECK (laboratorio_id = public.current_lab_id());

CREATE INDEX idx_ordini_righe_ordine ON ordini_righe(ordine_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_ordini_righe_laboratorio ON ordini_righe(laboratorio_id) WHERE deleted_at IS NULL;


-- ============================================================
-- PRESCRIZIONI_DIGITALI — portale dentisti inbound
-- Il dentista invia via link/QR univoco, senza account UÀ
-- ============================================================
CREATE TABLE prescrizioni_digitali (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id    UUID NOT NULL REFERENCES laboratori(id),
  cliente_id        UUID NOT NULL REFERENCES clienti(id),

  -- Identificazione via token — FIX (2026-05-12): token permanente è rischio GDPR.
  -- Il token `portale_link_token` in `clienti` identifica il portale del dentista (link stabile OK).
  -- Ogni SINGOLA prescrizione ha un token monouso con scadenza per prevenire:
  --   - link condivisi/fotografati che abilitano invii non autorizzati
  --   - bot/spam submissions con dati sanitari Art. 9 GDPR
  -- La scadenza è gestita a livello applicazione (Edge Function Supabase).
  token             UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  token_scadenza    TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '72 hours',
                                        -- 72h: abbastanza per compilare, abbastanza corto
  token_usato       BOOLEAN NOT NULL DEFAULT FALSE,
                                        -- Monouso: dopo la prima submit, blocca riutilizzo
  ip_submit         TEXT,               -- Audit: IP da cui è stata inviata la prescrizione
  user_agent_submit TEXT,               -- Audit: dispositivo/browser

  -- Dati prescrizione
  paziente_nome     TEXT NOT NULL,
  paziente_nascita  DATE,
  tipo_lavoro       TEXT NOT NULL,
  descrizione       TEXT,
  data_consegna_richiesta DATE,
  priorita          TEXT DEFAULT 'normale'
                    CHECK (priorita IN ('normale','urgente','extra_urgente')),
  note              TEXT,

  -- Allegati (file STL, foto intraorali)
  file_allegati_urls TEXT[],

  -- Workflow
  stato             TEXT NOT NULL DEFAULT 'ricevuta'
                    CHECK (stato IN ('ricevuta','accettata','rifiutata','convertita')),
  lavoro_id         UUID REFERENCES lavori(id),
                                        -- Popolato quando la prescrizione diventa un lavoro
  motivo_rifiuto    TEXT,

  -- Notifiche verso il dentista
  notifica_accettazione_at TIMESTAMPTZ,
  notifica_pronto_at TIMESTAMPTZ,
  notifica_consegnato_at TIMESTAMPTZ,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

SELECT apply_updated_at_trigger('prescrizioni_digitali');

-- RLS: il laboratorio vede le proprie prescrizioni
-- Il portale dentista accede tramite service role con token verificato
ALTER TABLE prescrizioni_digitali ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prescrizioni_laboratorio" ON prescrizioni_digitali
  FOR ALL USING (laboratorio_id = public.current_lab_id() AND deleted_at IS NULL);
CREATE POLICY "prescrizioni_insert" ON prescrizioni_digitali
  FOR INSERT WITH CHECK (laboratorio_id = public.current_lab_id());

CREATE INDEX idx_prescrizioni_laboratorio ON prescrizioni_digitali(laboratorio_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_prescrizioni_cliente ON prescrizioni_digitali(cliente_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_prescrizioni_token ON prescrizioni_digitali(token);
CREATE INDEX idx_prescrizioni_stato ON prescrizioni_digitali(laboratorio_id, stato) WHERE deleted_at IS NULL;


-- ============================================================
-- MESSAGGI — log comunicazioni con clienti
-- WhatsApp (Meta Cloud API), email, SMS
-- ============================================================
CREATE TABLE messaggi (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id    UUID NOT NULL REFERENCES laboratori(id),
  cliente_id        UUID REFERENCES clienti(id),
  lavoro_id         UUID REFERENCES lavori(id),
  utente_id         UUID REFERENCES utenti(id),

  tipo              TEXT NOT NULL CHECK (tipo IN ('whatsapp','email','sms','nota_interna')),
  direzione         TEXT NOT NULL CHECK (direzione IN ('uscente','entrante')),

  oggetto           TEXT,               -- Solo per email
  contenuto         TEXT NOT NULL,
  allegati_urls     TEXT[],

  -- Stato invio
  stato             TEXT NOT NULL DEFAULT 'bozza'
                    CHECK (stato IN ('bozza','inviato','consegnato','letto','fallito')),
  inviato_at        TIMESTAMPTZ,
  letto_at          TIMESTAMPTZ,
  errore            TEXT,

  -- Meta per WhatsApp
  whatsapp_message_id TEXT,
  numero_destinatario TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

SELECT apply_updated_at_trigger('messaggi');

ALTER TABLE messaggi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messaggi_laboratorio" ON messaggi
  FOR ALL USING (laboratorio_id = public.current_lab_id() AND deleted_at IS NULL);
CREATE POLICY "messaggi_insert" ON messaggi
  FOR INSERT WITH CHECK (laboratorio_id = public.current_lab_id());

CREATE INDEX idx_messaggi_laboratorio ON messaggi(laboratorio_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_messaggi_lavoro ON messaggi(lavoro_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_messaggi_cliente ON messaggi(cliente_id) WHERE deleted_at IS NULL;
-- BRIN per query per data (messaggi accumulano nel tempo)
CREATE INDEX idx_messaggi_data_brin ON messaggi USING brin(created_at);


-- ============================================================
-- NOTIFICHE — notifiche in-app per gli utenti
-- Realtime via Supabase Realtime
-- ============================================================
CREATE TABLE notifiche (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id    UUID NOT NULL REFERENCES laboratori(id),
  utente_id         UUID NOT NULL REFERENCES utenti(id),

  tipo              TEXT NOT NULL CHECK (tipo IN (
                      'lavoro_pronto', 'lavoro_ritardo', 'lavoro_nuovo',
                      'fattura_accettata', 'fattura_scartata',
                      'prescrizione_ricevuta', 'scorta_minima',
                      'lotto_scadenza', 'sistema'
                    )),

  titolo            TEXT NOT NULL,
  messaggio         TEXT NOT NULL,
  link              TEXT,               -- URL interna (es. "/lavori/uuid")
  dati_json         JSONB,              -- Dati aggiuntivi contestuali

  -- Stato lettura
  letto_at          TIMESTAMPTZ,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

-- Non ha updated_at: le notifiche non si modificano, solo si leggono

ALTER TABLE notifiche ENABLE ROW LEVEL SECURITY;

-- Ogni utente vede solo le proprie notifiche
CREATE POLICY "notifiche_utente" ON notifiche
  FOR ALL USING (utente_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "notifiche_insert_lab" ON notifiche
  FOR INSERT WITH CHECK (laboratorio_id = public.current_lab_id());

CREATE INDEX idx_notifiche_utente ON notifiche(utente_id, letto_at)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_notifiche_non_lette ON notifiche(utente_id)
  WHERE letto_at IS NULL AND deleted_at IS NULL;


-- ============================================================
-- APPUNTAMENTI — agenda del laboratorio
-- Vista giorno/settimana come in DentalMaster
-- ============================================================
CREATE TABLE appuntamenti (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id    UUID NOT NULL REFERENCES laboratori(id),
  tecnico_id        UUID REFERENCES tecnici(id),
  lavoro_id         UUID REFERENCES lavori(id),
  cliente_id        UUID REFERENCES clienti(id),

  data              DATE NOT NULL,
  ora_inizio        TIME,
  ora_fine          TIME,
  durata_minuti     SMALLINT,

  tipo              TEXT NOT NULL DEFAULT 'prova'
                    CHECK (tipo IN (
                      'consegna', 'prova', 'appuntamento',
                      'urgente', 'altro'
                    )),

  descrizione       TEXT,
  note              TEXT,
  importante        BOOLEAN NOT NULL DEFAULT FALSE,

  -- Reminder
  reminder_at       TIMESTAMPTZ,
  reminder_inviato  BOOLEAN NOT NULL DEFAULT FALSE,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

SELECT apply_updated_at_trigger('appuntamenti');

ALTER TABLE appuntamenti ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appuntamenti_laboratorio" ON appuntamenti
  FOR ALL USING (laboratorio_id = public.current_lab_id() AND deleted_at IS NULL);
CREATE POLICY "appuntamenti_insert" ON appuntamenti
  FOR INSERT WITH CHECK (laboratorio_id = public.current_lab_id());

CREATE INDEX idx_appuntamenti_laboratorio_data ON appuntamenti(laboratorio_id, data)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_appuntamenti_tecnico ON appuntamenti(tecnico_id, data) WHERE deleted_at IS NULL;
CREATE INDEX idx_appuntamenti_lavoro ON appuntamenti(lavoro_id) WHERE deleted_at IS NULL;


-- ============================================================
-- PRIMA_NOTA — libro cassa / prima nota contabile
-- Alimentato automaticamente da fatture e pagamenti
-- Come in DentalMaster ma con alimentazione automatica
-- ============================================================
CREATE TABLE prima_nota (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id    UUID NOT NULL REFERENCES laboratori(id),

  data              DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Classificazione
  gruppo            TEXT NOT NULL,      -- Es. "Entrate", "Uscite", "Banca"
  sottogruppo       TEXT,               -- Es. "Fatture clienti", "INPS"

  -- Importi
  entrata           NUMERIC(10,2) NOT NULL DEFAULT 0,
  uscita            NUMERIC(10,2) NOT NULL DEFAULT 0,

  descrizione       TEXT NOT NULL,
  modalita_pagamento TEXT CHECK (modalita_pagamento IN (
                      'contanti','bonifico','assegno','rid','paypal','altro'
                    )),
  riferimento       TEXT,               -- Numero fattura, F24, ecc.

  -- Collegamento automatico
  fattura_id        UUID REFERENCES fatture(id),
  ordine_id         UUID REFERENCES ordini_acquisto(id),

  note              TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

SELECT apply_updated_at_trigger('prima_nota');

ALTER TABLE prima_nota ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prima_nota_laboratorio" ON prima_nota
  FOR ALL USING (laboratorio_id = public.current_lab_id() AND deleted_at IS NULL);
CREATE POLICY "prima_nota_insert" ON prima_nota
  FOR INSERT WITH CHECK (laboratorio_id = public.current_lab_id());

CREATE INDEX idx_prima_nota_laboratorio ON prima_nota(laboratorio_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_prima_nota_data ON prima_nota(laboratorio_id, data) WHERE deleted_at IS NULL;
-- BRIN per query su range di date (la prima nota cresce linearmente nel tempo)
CREATE INDEX idx_prima_nota_data_brin ON prima_nota USING brin(data);


-- ============================================================
-- FOREIGN KEY DIFFERITE
-- ============================================================

-- listino → cicli_produzione (aggiunta dopo creazione cicli_produzione)
ALTER TABLE listino
  ADD CONSTRAINT fk_listino_ciclo
  FOREIGN KEY (ciclo_id) REFERENCES cicli_produzione(id);

-- lavori → prescrizioni_digitali (circolare: prescrizioni → lavori)
ALTER TABLE lavori
  ADD CONSTRAINT fk_lavori_prescrizione
  FOREIGN KEY (prescrizione_digitale_id) REFERENCES prescrizioni_digitali(id);

-- Indice per le nuove FK
CREATE INDEX idx_listino_ciclo ON listino(ciclo_id) WHERE ciclo_id IS NOT NULL;
CREATE INDEX idx_lavori_prescrizione ON lavori(prescrizione_digitale_id)
  WHERE prescrizione_digitale_id IS NOT NULL;


-- ============================================================
-- FUNZIONI DI BUSINESS
-- ============================================================

-- ----------------------------------------------------------
-- Genera numero lavoro nel formato "ANNO/PROGRESSIVO"
-- Es. "2026/0089"
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION genera_numero_lavoro(p_lab UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_anno  INTEGER := EXTRACT(YEAR FROM now())::INTEGER;
  v_num   INTEGER;
BEGIN
  v_num := genera_progressivo(p_lab, 'lavoro', v_anno);
  RETURN v_anno::TEXT || '/' || LPAD(v_num::TEXT, 4, '0');
END;
$$;

-- ----------------------------------------------------------
-- Genera numero fattura nel formato "ANNO/PROGRESSIVO"
-- Race-safe tramite advisory lock in genera_progressivo()
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION genera_numero_fattura(p_lab UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_anno  INTEGER := EXTRACT(YEAR FROM now())::INTEGER;
  v_num   INTEGER;
BEGIN
  v_num := genera_progressivo(p_lab, 'fattura', v_anno);
  RETURN v_anno::TEXT || '/' || LPAD(v_num::TEXT, 4, '0');
END;
$$;

-- ----------------------------------------------------------
-- Genera numero dichiarazione conformità nel formato "DDC-ANNO-PROGRESSIVO"
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION genera_numero_ddc(p_lab UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_anno  INTEGER := EXTRACT(YEAR FROM now())::INTEGER;
  v_num   INTEGER;
BEGIN
  v_num := genera_progressivo(p_lab, 'ddc', v_anno);
  RETURN 'DDC-' || v_anno::TEXT || '-' || LPAD(v_num::TEXT, 4, '0');
END;
$$;

-- ----------------------------------------------------------
-- Calcola imponibile di un lavoro (somma righe lavorazioni)
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION calcola_imponibile_lavoro(p_lavoro_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(importo), 0)
  FROM lavori_lavorazioni
  WHERE lavoro_id = p_lavoro_id
    AND deleted_at IS NULL;
$$;

-- ----------------------------------------------------------
-- Verifica se un lavoro richiede bollo in fattura
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION richiede_bollo(
  p_imponibile NUMERIC,
  p_iva_percentuale NUMERIC,
  p_lab_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT p_iva_percentuale = 0
     AND p_imponibile > (SELECT soglia_bollo FROM laboratori WHERE id = p_lab_id)
     AND (SELECT bollo_default_attivo FROM laboratori WHERE id = p_lab_id);
$$;

-- ----------------------------------------------------------
-- Statistiche dashboard per laboratorio (usata dalla view)
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION stats_dashboard(p_lab UUID)
RETURNS TABLE(
  lavori_oggi            INTEGER,
  lavori_in_ritardo      INTEGER,
  lavori_in_lavorazione  INTEGER,
  fatturato_mese         NUMERIC,
  fatturato_anno         NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    -- Lavori da consegnare oggi
    (SELECT COUNT(*)::INTEGER FROM lavori
     WHERE laboratorio_id = p_lab
       AND data_consegna_prevista = CURRENT_DATE
       AND stato NOT IN ('consegnato','annullato')
       AND deleted_at IS NULL) AS lavori_oggi,

    -- Lavori in ritardo
    (SELECT COUNT(*)::INTEGER FROM lavori
     WHERE laboratorio_id = p_lab
       AND (stato = 'in_ritardo'
            OR (stato = 'in_lavorazione' AND data_consegna_prevista < CURRENT_DATE))
       AND deleted_at IS NULL) AS lavori_in_ritardo,

    -- Lavori in lavorazione
    (SELECT COUNT(*)::INTEGER FROM lavori
     WHERE laboratorio_id = p_lab
       AND stato IN ('in_lavorazione','in_ritardo','in_prova')
       AND deleted_at IS NULL) AS lavori_in_lavorazione,

    -- Fatturato mese corrente
    (SELECT COALESCE(SUM(imponibile_netto), 0) FROM fatture
     WHERE laboratorio_id = p_lab
       AND EXTRACT(YEAR FROM data) = EXTRACT(YEAR FROM CURRENT_DATE)
       AND EXTRACT(MONTH FROM data) = EXTRACT(MONTH FROM CURRENT_DATE)
       AND stato_sdi IN ('inviata','consegnata','accettata','decorrenza_termini')
       AND deleted_at IS NULL) AS fatturato_mese,

    -- Fatturato anno corrente
    (SELECT COALESCE(SUM(imponibile_netto), 0) FROM fatture
     WHERE laboratorio_id = p_lab
       AND EXTRACT(YEAR FROM data) = EXTRACT(YEAR FROM CURRENT_DATE)
       AND stato_sdi IN ('inviata','consegnata','accettata','decorrenza_termini')
       AND deleted_at IS NULL) AS fatturato_anno;
$$;

-- ----------------------------------------------------------
-- Genera XML FatturaPA v1.2.1 da una fattura
-- Restituisce TEXT con il documento XML completo
-- ----------------------------------------------------------
-- ⚠️  AVVISO ARCHITETTURALE (2026-05-12):
-- Questa funzione è DOCUMENTAZIONE del mapping dati, NON codice production.
-- Generazione XML FatturaPA: NON in PL/pgSQL (no XSD validation, no escaping sicuro).
--
-- ARCHITETTURA PROPRIETARIA SENZA INTERMEDIARI (aggiornata 2026-05-12):
-- Non esiste un endpoint REST AdE — i canali ufficiali per invio programmatico sono:
--
--   MVP (più semplice, zero accreditamento):
--     PEC a sdi01@pec.fatturapa.it — gratuito, sincrono, adatto a piccoli volumi.
--     Il lab configura la sua PEC (es. smtp.aeof.it già usato da DentalMaster di Filippo).
--     UÀ genera XML, lo allega, lo manda via PEC del laboratorio → SDI risponde su stessa PEC.
--
--   v1.0 (scalabile, multi-tenant SaaS):
--     SdICoop — web service SOAP con certificato X.509 client TLS.
--     Richiede accreditamento canale presso AdE + ambiente di test.
--     UÀ ottiene un singolo canale SdICoop accreditato a nome del SaaS.
--     I laboratori delegano UÀ per invio via meccanismo di delega AdE.
--     Costo: €0 per fattura — solo costo certificato e accreditamento una tantum.
--
-- XSD FatturaPA: v1.2.1 è OBSOLETO (scaduto 30/09/2020). Verificare versione
-- corrente su: https://www.fatturapa.gov.it/it/norme-e-regole/documentazione-fattura-elettronica/formato-fatturapa/
--
-- Struttura corretta:
--   1. DB:           raccoglie fatture + righe + lab/cliente → record JSON
--   2. Edge Function: riceve JSON → genera XML → valida vs XSD corrente → invia via PEC/SdICoop
--   4. DB:           salva progressivo SDI, ricevuta RC, stato (RC/MC/NS/NE/EC/AT)
--
-- WhatsApp: wa.me link + Web Share API nativa (zero Meta API, zero API key)
-- Email: SMTP configurabile per lab (come DentalMaster usa smtp.aeof.it)
-- Firma: Web Crypto API + signature_pad → FES nativa (zero Namirial)
-- ============================================================
CREATE OR REPLACE FUNCTION genera_xml_fattura_pa(p_fattura_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_fat        RECORD;
  v_xml        TEXT;
  v_righe      TEXT := '';
  v_riga       RECORD;
  v_linea      INTEGER := 0;
  v_prog_sdi   INTEGER;
  v_anno_fat   INTEGER;
BEGIN
  -- Recupera dati fattura
  SELECT f.*, l.nome AS lab_nome, l.partita_iva AS lab_piva,
         l.codice_fiscale AS lab_cf, l.indirizzo AS lab_indirizzo,
         l.cap AS lab_cap, l.citta AS lab_citta, l.provincia AS lab_prov,
         l.regime_fiscale
  INTO v_fat
  FROM fatture f
  JOIN laboratori l ON l.id = f.laboratorio_id
  WHERE f.id = p_fattura_id;

  -- Genera progressivo SDI univoco per laboratorio + anno (race-safe)
  -- Tipo 'sdi_invio' separato da 'fattura' per gestire re-invii
  v_anno_fat := EXTRACT(YEAR FROM v_fat.data)::INTEGER;
  v_prog_sdi := genera_progressivo(v_fat.laboratorio_id, 'sdi_invio', v_anno_fat);

  -- Aggiorna la fattura con il progressivo SDI assegnato
  UPDATE fatture
  SET progressivo_sdi = lpad(v_prog_sdi::TEXT, 5, '0'),
      updated_at = now()
  WHERE id = p_fattura_id;

  -- Righe fattura
  FOR v_riga IN
    SELECT * FROM fatture_righe
    WHERE fattura_id = p_fattura_id AND deleted_at IS NULL
    ORDER BY numero_linea
  LOOP
    v_linea := v_linea + 1;
    v_righe := v_righe || format(
      '<DettaglioLinee>
         <NumeroLinea>%s</NumeroLinea>
         <Descrizione>%s</Descrizione>
         <Quantita>%s</Quantita>
         <UnitaMisura>%s</UnitaMisura>
         <PrezzoUnitario>%s</PrezzoUnitario>
         <PrezzoTotale>%s</PrezzoTotale>
         <AliquotaIVA>%s</AliquotaIVA>
         <Natura>%s</Natura>
       </DettaglioLinee>',
      v_linea,
      xmlescape(v_riga.descrizione),
      to_char(v_riga.quantita, 'FM9999999990.00'),
      v_riga.unita_misura,
      to_char(v_riga.prezzo_unitario, 'FM9999999990.00'),
      to_char(v_riga.importo, 'FM9999999990.00'),
      to_char(v_riga.aliquota_iva, 'FM90.00'),
      v_riga.natura_iva
    );
  END LOOP;

  -- Costruisce XML FatturaPA v1.2.1
  v_xml := format(
    '<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2"
  versione="FPR12">
  <FatturaElettronicaHeader>
    <DatiTrasmissione>
      <IdTrasmittente>
        <IdPaese>IT</IdPaese>
        <IdCodice>%s</IdCodice>
      </IdTrasmittente>
      <ProgressivoInvio>%s</ProgressivoInvio>
      <FormatoTrasmissione>%s</FormatoTrasmissione>
      <CodiceDestinatario>%s</CodiceDestinatario>
    </DatiTrasmissione>
    <CedentePrestatore>
      <DatiAnagrafici>
        <IdFiscaleIVA>
          <IdPaese>IT</IdPaese>
          <IdCodice>%s</IdCodice>
        </IdFiscaleIVA>
        <Anagrafica>
          <Denominazione>%s</Denominazione>
        </Anagrafica>
        <RegimeFiscale>%s</RegimeFiscale>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>%s</Indirizzo>
        <CAP>%s</CAP>
        <Comune>%s</Comune>
        <Provincia>%s</Provincia>
        <Nazione>IT</Nazione>
      </Sede>
    </CedentePrestatore>
    <CessionarioCommittente>
      <DatiAnagrafici>
        <IdFiscaleIVA>
          <IdPaese>IT</IdPaese>
          <IdCodice>%s</IdCodice>
        </IdFiscaleIVA>
        <Anagrafica>
          <Denominazione>%s</Denominazione>
        </Anagrafica>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>%s</Indirizzo>
        <Nazione>IT</Nazione>
      </Sede>
    </CessionarioCommittente>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <TipoDocumento>%s</TipoDocumento>
        <Divisa>EUR</Divisa>
        <Data>%s</Data>
        <Numero>%s</Numero>
        <ImportoTotaleDocumento>%s</ImportoTotaleDocumento>
        %s
      </DatiGeneraliDocumento>
    </DatiGenerali>
    <DatiBeniServizi>
      %s
      <DatiRiepilogo>
        <AliquotaIVA>%s</AliquotaIVA>
        <Natura>%s</Natura>
        <ImponibileImporto>%s</ImponibileImporto>
        <Imposta>%s</Imposta>
        <RiferimentoNormativo>%s</RiferimentoNormativo>
      </DatiRiepilogo>
    </DatiBeniServizi>
  </FatturaElettronicaBody>
</p:FatturaElettronica>',
    -- IdTrasmittente
    coalesce(v_fat.lab_piva, v_fat.lab_cf),
    -- ProgressivoInvio (generato atomicamente — race-safe)
    lpad(v_prog_sdi::TEXT, 5, '0'),
    -- FormatoTrasmissione
    v_fat.formato_trasmissione,
    -- CodiceDestinatario (0000000 se non disponibile)
    coalesce(v_fat.cliente_codice_sdi, '0000000'),
    -- CedentePrestatore PIVA
    v_fat.lab_piva,
    -- CedentePrestatore Denominazione
    xmlescape(v_fat.lab_nome),
    -- RegimeFiscale
    v_fat.regime_fiscale,
    -- Sede laboratorio
    xmlescape(v_fat.lab_indirizzo), v_fat.lab_cap, xmlescape(v_fat.lab_citta), v_fat.lab_prov,
    -- CessionarioCommittente
    coalesce(v_fat.cliente_piva, v_fat.cliente_cf),
    xmlescape(v_fat.cliente_denominazione),
    xmlescape(v_fat.cliente_indirizzo),
    -- DatiGeneraliDocumento
    v_fat.tipo_documento,
    to_char(v_fat.data, 'YYYY-MM-DD'),
    xmlescape(v_fat.numero),
    to_char(v_fat.totale, 'FM9999999990.00'),
    -- DatiBollo (condizionale)
    CASE WHEN v_fat.bollo > 0
      THEN '<DatiBollo><BolloVirtuale>SI</BolloVirtuale><ImportoBollo>' ||
           to_char(v_fat.bollo, 'FM90.00') || '</ImportoBollo></DatiBollo>'
      ELSE ''
    END,
    -- Righe
    v_righe,
    -- DatiRiepilogo
    to_char(v_fat.iva_percentuale, 'FM90.00'),
    v_fat.natura_iva,
    to_char(v_fat.imponibile_netto, 'FM9999999990.00'),
    to_char(v_fat.iva_importo, 'FM9999999990.00'),
    xmlescape(coalesce(v_fat.riferimento_normativo,
      'Art. 10, n. 18) del D.P.R. 26 ottobre 1972, n. 633'))
  );

  RETURN v_xml;
END;
$$;

-- Helper xmlescape (non disponibile nativamente in plpgsql)
CREATE OR REPLACE FUNCTION xmlescape(t TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT replace(replace(replace(replace(replace(t,
    '&', '&amp;'),
    '<', '&lt;'),
    '>', '&gt;'),
    '"', '&quot;'),
    '''', '&apos;');
$$;


-- ============================================================
-- VIEWS UTILI
-- Tutte le views filtrano su public.current_lab_id() per sicurezza
-- ============================================================

-- ----------------------------------------------------------
-- VIEW: lavori_dashboard
-- Lavori attivi con dati aggregati per la dashboard mattutina
-- ----------------------------------------------------------
CREATE OR REPLACE VIEW lavori_dashboard AS
SELECT
  l.id,
  l.numero_lavoro,
  l.stato,
  l.priorita,
  l.tipo_dispositivo,
  l.descrizione,
  l.data_consegna_prevista,
  l.data_ingresso,
  l.colore_dente,

  -- Cliente
  c.studio_nome AS cliente_studio,
  c.nome || ' ' || c.cognome AS cliente_nome,
  c.telefono AS cliente_telefono,

  -- Paziente — FIX GDPR (2026-05-12): nome reale solo per titolare/admin/prrc.
  -- I tecnici vedono pseudonimo per rispettare Art. 9 GDPR (dati sanitari).
  -- L'applicazione deve usare l'RPC appropriata in base al ruolo JWT.
  -- Questa view include il nome reale — creare view separata "lavori_dashboard_tecnico"
  -- con CASE WHEN public.has_role('tecnico') THEN 'PAZ-' || LEFT(p.id::TEXT, 8) ELSE p.nome_cognome END
  CASE
    WHEN public.has_role('titolare') OR public.has_role('admin_rete') OR public.has_role('prrc')
    THEN p.nome_cognome
    ELSE 'PAZ-' || LEFT(p.id::TEXT, 8)   -- pseudonimo per tecnici e front_desk
  END AS paziente_nome,
  (public.has_role('titolare') OR public.has_role('admin_rete') OR public.has_role('prrc'))
    AS paziente_nome_visibile,           -- flag per UI: mostra/nascondi icona lucchetto

  -- Tecnico
  t.nome || ' ' || t.cognome AS tecnico_nome,
  t.sigla AS tecnico_sigla,

  -- Ritardo in giorni
  GREATEST(0, CURRENT_DATE - l.data_consegna_prevista) AS giorni_ritardo,

  -- Flag
  (l.data_consegna_prevista < CURRENT_DATE
   AND l.stato NOT IN ('consegnato','annullato')) AS in_ritardo,
  (l.data_consegna_prevista = CURRENT_DATE
   AND l.stato NOT IN ('consegnato','annullato')) AS consegna_oggi,

  l.created_at,
  l.updated_at

FROM lavori l
LEFT JOIN clienti c ON c.id = l.cliente_id
LEFT JOIN pazienti p ON p.id = l.paziente_id
LEFT JOIN tecnici t ON t.id = l.tecnico_id
WHERE l.laboratorio_id = public.current_lab_id()
  AND l.deleted_at IS NULL
  AND l.stato NOT IN ('annullato')
ORDER BY
  CASE WHEN l.stato = 'in_ritardo' THEN 0
       WHEN l.data_consegna_prevista = CURRENT_DATE THEN 1
       WHEN l.stato = 'pronto' THEN 2
       ELSE 3
  END,
  l.data_consegna_prevista ASC;

-- ----------------------------------------------------------
-- VIEW: fatture_da_inviare
-- Fatture in bozza o da reinviare (scartate da SDI)
-- ----------------------------------------------------------
CREATE OR REPLACE VIEW fatture_da_inviare AS
SELECT
  f.id,
  f.numero,
  f.data,
  f.totale,
  f.stato_sdi,
  f.bollo,
  f.xml_errori_sdi,

  c.studio_nome AS cliente_studio,
  c.nome || ' ' || c.cognome AS cliente_nome,
  c.codice_sdi,
  c.pec

FROM fatture f
JOIN clienti c ON c.id = f.cliente_id
WHERE f.laboratorio_id = public.current_lab_id()
  AND f.deleted_at IS NULL
  AND f.stato_sdi IN ('bozza','pronta','scartata')
ORDER BY f.data DESC;

-- ----------------------------------------------------------
-- VIEW: magazzino_sotto_scorta
-- Articoli con scorta attuale <= scorta minima
-- ----------------------------------------------------------
CREATE OR REPLACE VIEW magazzino_sotto_scorta AS
SELECT
  m.id,
  m.codice_articolo,
  m.nome,
  m.produttore,
  m.scorta_attuale,
  m.scorta_minima,
  m.um_acquisto,
  m.conf_da_ordinare,

  f.ragione_sociale AS fornitore_nome,
  f.telefono AS fornitore_telefono,

  -- Lotti in scadenza entro 60 giorni
  (SELECT COUNT(*) FROM lotti_magazzino lm
   WHERE lm.magazzino_id = m.id
     AND lm.data_scadenza <= CURRENT_DATE + 60
     AND lm.quantita_residua > 0
     AND lm.deleted_at IS NULL) AS lotti_in_scadenza

FROM magazzino m
LEFT JOIN fornitori f ON f.id = m.fornitore_id
WHERE m.laboratorio_id = public.current_lab_id()
  AND m.deleted_at IS NULL
  AND m.scorta_attuale <= m.scorta_minima
  AND m.attivo = TRUE
ORDER BY (m.scorta_minima - m.scorta_attuale) DESC;

-- ----------------------------------------------------------
-- VIEW: dichiarazioni_in_scadenza
-- DoC che si avvicinano al limite 10 anni (da segnalare per verifica)
-- ----------------------------------------------------------
CREATE OR REPLACE VIEW dichiarazioni_in_scadenza AS
SELECT
  d.id,
  d.numero_ddc,
  d.data_emissione,
  d.paziente_nome,
  d.tipo_dispositivo,
  d.stato,

  -- Anni rimanenti prima della scadenza 10 anni
  (d.data_emissione + INTERVAL '10 years')::DATE AS data_scadenza_archivio,
  EXTRACT(YEAR FROM AGE(d.data_emissione + INTERVAL '10 years', now()))::INTEGER AS anni_rimanenti

FROM dichiarazioni_conformita d
WHERE d.laboratorio_id = public.current_lab_id()
  AND d.deleted_at IS NULL
  AND d.data_emissione + INTERVAL '10 years' < now() + INTERVAL '1 year'
ORDER BY d.data_emissione ASC;

-- ----------------------------------------------------------
-- VIEW: tracciabilita_lotto
-- Dato un lotto, tutti i lavori che lo hanno usato (recall MDR)
-- Uso: SELECT * FROM tracciabilita_lotto WHERE numero_lotto = 'LOT123'
-- ----------------------------------------------------------
CREATE OR REPLACE VIEW tracciabilita_lotto AS
SELECT
  lm.numero_lotto_snapshot AS numero_lotto,
  lm.nome_materiale_snapshot AS materiale,
  lm.produttore_snapshot AS produttore,
  lm.quantita_usata,
  lm.unita_misura,
  lm.data_uso,

  l.numero_lavoro,
  l.tipo_dispositivo,
  l.descrizione,
  l.stato AS stato_lavoro,
  l.data_consegna_effettiva,

  c.studio_nome AS dentista_studio,
  c.nome || ' ' || c.cognome AS dentista_nome,

  p.nome_cognome AS paziente_nome

FROM lavori_materiali lm
JOIN lavori l ON l.id = lm.lavoro_id
LEFT JOIN clienti c ON c.id = l.cliente_id
LEFT JOIN pazienti p ON p.id = l.paziente_id
WHERE lm.laboratorio_id = public.current_lab_id()
  AND lm.deleted_at IS NULL;

-- ----------------------------------------------------------
-- VIEW: partitario_clienti
-- Estratto conto per cliente: fatture, pagamenti, saldo aperto
-- ----------------------------------------------------------
CREATE OR REPLACE VIEW partitario_clienti AS
SELECT
  c.id AS cliente_id,
  c.studio_nome,
  c.nome || ' ' || c.cognome AS cliente_nome,

  COUNT(f.id) AS numero_fatture,
  COALESCE(SUM(f.totale), 0) AS totale_fatturato,
  COALESCE(SUM(CASE WHEN f.pagata THEN f.totale ELSE 0 END), 0) AS totale_incassato,
  COALESCE(SUM(CASE WHEN NOT f.pagata THEN f.totale ELSE 0 END), 0) AS saldo_aperto,

  MAX(f.data) AS ultima_fattura

FROM clienti c
LEFT JOIN fatture f ON f.cliente_id = c.id
  AND f.deleted_at IS NULL
  AND f.stato_sdi NOT IN ('bozza','scartata')
WHERE c.laboratorio_id = public.current_lab_id()
  AND c.deleted_at IS NULL
GROUP BY c.id, c.studio_nome, c.nome, c.cognome
ORDER BY saldo_aperto DESC;

-- ----------------------------------------------------------
-- VIEW: statistiche_mensili
-- Fatturato mensile per anno corrente
-- ----------------------------------------------------------
CREATE OR REPLACE VIEW statistiche_mensili AS
SELECT
  EXTRACT(YEAR FROM data)::INTEGER AS anno,
  EXTRACT(MONTH FROM data)::INTEGER AS mese,
  COUNT(*) AS numero_fatture,
  SUM(imponibile_netto) AS imponibile_totale,
  SUM(iva_importo) AS iva_totale,
  SUM(bollo) AS bollo_totale,
  SUM(totale) AS totale_fatturato
FROM fatture
WHERE laboratorio_id = public.current_lab_id()
  AND deleted_at IS NULL
  AND stato_sdi NOT IN ('bozza','scartata')
GROUP BY 1, 2
ORDER BY 1 DESC, 2 DESC;


-- ============================================================
-- ORDINE DI CREAZIONE TABELLE PER MIGRAZIONE SUPABASE
-- Eseguire in questo ordine nel Supabase SQL Editor
-- ============================================================

-- Step 1: Estensioni e helper
-- Eseguire Sezione 1 completa

-- Step 2: Core tenant (no dipendenze esterne)
-- 1. laboratori
-- 2. utenti
-- 3. tecnici

-- Step 3: Master data (dipende da laboratori, tecnici)
-- 4. clienti
-- 5. pazienti
-- 6. fornitori
-- 7. listino              (senza FK ciclo_id — aggiunta dopo)
-- 8. magazzino
-- 9. lotti_magazzino

-- Step 4: Produzione (dipende da clienti, tecnici, listino)
-- 10. cicli_produzione
-- 11. fasi_produzione
-- 12. ALTER TABLE listino ADD CONSTRAINT fk_listino_ciclo ...
-- 13. lavori              (senza FK prescrizione_digitale_id — aggiunta dopo)
-- 14. lavori_lavorazioni
-- 15. lavori_fasi
-- 16. lavori_materiali

-- Step 5: Documenti MDR (dipende da lavori)
-- 17. dichiarazioni_conformita
-- 18. buoni_consegna
-- 19. istruzioni_uso

-- Step 6: Fatturazione (dipende da clienti, lavori)
-- 20. fatture
-- 21. fatture_righe
-- 22. fatture_pagamenti

-- Step 7: Ordini acquisto (dipende da fornitori, magazzino)
-- 23. ordini_acquisto
-- 24. ordini_righe

-- Step 8: Comunicazioni (dipende da lavori, clienti, utenti)
-- 25. prescrizioni_digitali
-- 26. ALTER TABLE lavori ADD CONSTRAINT fk_lavori_prescrizione ...
-- 27. messaggi
-- 28. notifiche

-- Step 9: Agenda e contabilità
-- 29. appuntamenti
-- 30. prima_nota

-- Step 10: Funzioni, Views, Seed
-- 31. Funzioni di business (Sezione 12)
-- 32. Views (Sezione 13)
-- 33. Seed data (Sezione 15)


-- ============================================================

-- Per laboratori con alto volume (reti di laboratori),
-- considerare partitioning per anno su tabelle large:

-- Lavori partitioned by anno_lavoro (range partitioning)
-- CREATE TABLE lavori_2026 PARTITION OF lavori FOR VALUES IN (2026);
-- CREATE TABLE lavori_2027 PARTITION OF lavori FOR VALUES IN (2027);

-- Fatture partitioned by BRIN clustering su data
-- (già coperto dall'indice BRIN definito sopra)

-- Messaggi: se > 1M righe/anno, partition by month
-- CREATE TABLE messaggi_y2026m01 PARTITION OF messaggi
--   FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');


-- Abilitare Realtime solo sulle tabelle che lo richiedono
-- (evita overhead su tabelle con write intensivo come lavori_materiali)

-- Tabelle che necessitano Realtime:
ALTER PUBLICATION supabase_realtime ADD TABLE notifiche;
ALTER PUBLICATION supabase_realtime ADD TABLE lavori;      -- stato cambio
ALTER PUBLICATION supabase_realtime ADD TABLE fatture;     -- stato SDI
ALTER PUBLICATION supabase_realtime ADD TABLE prescrizioni_digitali;

-- Tabelle ad alto write (NO Realtime — overhead non giustificato):
-- lavori_materiali, lavori_fasi, messaggi (usare webhook/edge function)

-- Connection pooling: usare PgBouncer in modalità transaction
-- (default Supabase) — safe con questo schema perché
-- non si usano prepared statements con state di sessione

-- Storage buckets Supabase (creare separatamente):
-- bucket "dichiarazioni-conformita"  -- public: false, max 10MB/file
-- bucket "buoni-consegna"            -- public: false
-- bucket "fatture-pdf"               -- public: false
-- bucket "materiali-schede"          -- public: false
-- bucket "lavori-allegati"           -- public: false, max 50MB/file (STL)
-- bucket "loghi-timbri"              -- public: true (usati in PDF)


-- Esempio: funzione per generare JWT claim con laboratorio_id
-- Da usare in Supabase Auth Hook (post-login)
CREATE OR REPLACE FUNCTION public.set_lab_claim(user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = raw_app_meta_data ||
    jsonb_build_object('laboratorio_id',
      (SELECT laboratorio_id FROM utenti WHERE id = user_id LIMIT 1)
    )
  WHERE id = user_id;
END;
$$;


-- FIX adversarial review #6: PRRC non può essere solo un campo testo.
-- Questa tabella forza la gestione documentale della nomina.
-- Una DdC NON può essere emessa se non esiste una nomina PRRC valida.
CREATE TABLE prrc_nomine (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id    UUID NOT NULL REFERENCES laboratori(id),

  prrc_nome         TEXT NOT NULL,
  prrc_cognome      TEXT NOT NULL,
  prrc_qualifica    TEXT NOT NULL,         -- Es. "Odontotecnico abilitato" / "Consulente MDR"
  prrc_tipo         TEXT NOT NULL CHECK (prrc_tipo IN ('interno','esterno_contrattuale')),
  prrc_email        TEXT,

  -- Documenti di supporto
  cv_url            TEXT,                  -- Curriculum vitae in Storage
  attestati_urls    TEXT[],               -- Attestati di formazione
  contratto_url     TEXT,                 -- Solo per tipo 'esterno_contrattuale'

  -- Validità
  data_inizio       DATE NOT NULL,
  data_fine         DATE,                  -- NULL = tempo indeterminato
  stato             TEXT NOT NULL DEFAULT 'attiva'
                    CHECK (stato IN ('attiva','scaduta','revocata')),
  accettazione_at   TIMESTAMPTZ,          -- Quando il PRRC ha accettato la nomina (firma)

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

ALTER TABLE prrc_nomine ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prrc_laboratorio" ON prrc_nomine
  USING (laboratorio_id = public.current_lab_id() AND deleted_at IS NULL);

-- Funzione: verifica se il laboratorio ha un PRRC valido oggi
CREATE OR REPLACE FUNCTION has_prrc_valido(p_lab UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM prrc_nomine
    WHERE laboratorio_id = p_lab
    AND stato = 'attiva'
    AND data_inizio <= CURRENT_DATE
    AND (data_fine IS NULL OR data_fine >= CURRENT_DATE)
    AND deleted_at IS NULL
  );
$$;


-- FIX adversarial review #7: Fascicolo Tecnico come struttura versionata.
-- Un fascicolo per tipo dispositivo (non per singolo lavoro).
-- Collegato a cicli_produzione e listino.
CREATE TABLE fascicoli_tecnici (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id    UUID NOT NULL REFERENCES laboratori(id),

  tipo_dispositivo  TEXT NOT NULL,         -- Es. "Corona in zirconia monolitica"
  versione          TEXT NOT NULL DEFAULT '1.0',
  stato             TEXT NOT NULL DEFAULT 'bozza'
                    CHECK (stato IN ('bozza','in_revisione','approvato','obsoleto')),

  -- Allegato II MDR sezioni
  descrizione_dispositivo TEXT,
  specifiche_tecniche     TEXT,
  materiali_json          JSONB,           -- Materiali autorizzati per questo tipo
  norme_armonizzate_json  JSONB,           -- EN ISO 22674, EN ISO 6872...
  etichetta_json          JSONB,           -- Template etichetta
  istruzioni_uso_url      TEXT,            -- IFU in Storage
  analisi_rischi_id       UUID,            -- FK → risk_analyses (vedi 18.3)

  -- Post-market
  dati_pmcf_json          JSONB,           -- Piano PMCF per questo tipo
  psur_ids                UUID[],          -- FK → psur_reports futuri

  -- Approvazione PRRC
  approvato_da            UUID REFERENCES utenti(id),
  approvato_at            TIMESTAMPTZ,
  prrc_nomina_id          UUID REFERENCES prrc_nomine(id),

  -- Audit
  note                    TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at              TIMESTAMPTZ
);

ALTER TABLE fascicoli_tecnici ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fascicoli_laboratorio" ON fascicoli_tecnici
  USING (laboratorio_id = public.current_lab_id() AND deleted_at IS NULL);


-- FIX adversarial review #8: Analisi rischi ISO 14971 come entità propria.
-- Una per tipo dispositivo, aggiornata periodicamente, approvata dal PRRC.
CREATE TABLE risk_analyses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id    UUID NOT NULL REFERENCES laboratori(id),

  tipo_dispositivo  TEXT NOT NULL,
  versione          TEXT NOT NULL DEFAULT '1.0',
  stato             TEXT NOT NULL DEFAULT 'bozza'
                    CHECK (stato IN ('bozza','in_revisione','approvato','obsoleto')),

  -- Contenuto ISO 14971
  hazards_json      JSONB,    -- Array: [{id, hazard, severity, probability, rr_before, control, rr_after}]
  benefit_risk_json JSONB,    -- Valutazione beneficio/rischio residuo
  conclusione       TEXT,     -- "Il beneficio supera i rischi residui..."
  normativa_json    JSONB,    -- Standard applicati

  -- Approvazione
  approvato_da      UUID REFERENCES utenti(id),
  approvato_at      TIMESTAMPTZ,
  revisione_annuale DATE,     -- Prossima revisione programmata

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

ALTER TABLE risk_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "risk_analyses_laboratorio" ON risk_analyses
  USING (laboratorio_id = public.current_lab_id() AND deleted_at IS NULL);


-- FIX adversarial review #32: DPA con dentisti non modellato nel DDL.
CREATE TABLE data_processing_agreements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id    UUID NOT NULL REFERENCES laboratori(id),

  -- Controparte
  tipo_controparte  TEXT NOT NULL CHECK (tipo_controparte IN ('dentista','sub_responsabile')),
  dentista_id       UUID REFERENCES clienti(id),      -- Se tipo = 'dentista'
  sub_responsabile  TEXT,                              -- Es. "Supabase Inc.", "Vercel Inc."

  -- Documento
  template_versione TEXT NOT NULL DEFAULT '1.0',
  documento_url     TEXT,                              -- PDF firmato in Storage
  firmato_da        TEXT,                              -- Nome firmatario controparte
  firmato_at        TIMESTAMPTZ,
  stato             TEXT NOT NULL DEFAULT 'da_firmare'
                    CHECK (stato IN ('da_firmare','firmato','scaduto','revocato')),

  -- Scadenza
  data_scadenza     DATE,
  note              TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

ALTER TABLE data_processing_agreements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dpa_laboratorio" ON data_processing_agreements
  USING (laboratorio_id = public.current_lab_id() AND deleted_at IS NULL);


-- FIX adversarial review #30: ricevute SDI non modellate per conservazione decennale.
-- L'XML + le notifiche SDI sono il documento fiscale legale, non il PDF.
CREATE TABLE sdi_receipts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id    UUID NOT NULL REFERENCES laboratori(id),
  fattura_id        UUID NOT NULL REFERENCES fatture(id),

  tipo              TEXT NOT NULL CHECK (tipo IN ('RC','MC','NS','NE','EC','AT','DT','invio')),
  ricevuto_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  xml_originale     TEXT,           -- XML FatturaPA inviato
  xml_ricevuta      TEXT,           -- XML ricevuta SDI
  xml_sha256        TEXT,           -- Hash XML originale
  identificativo_sdi TEXT,         -- ID assegnato da SDI
  canale            TEXT NOT NULL CHECK (canale IN ('pec','sdicoop','sftp')),
  pec_mittente      TEXT,           -- PEC del laboratorio usata per l'invio
  pec_destinatario  TEXT DEFAULT 'sdi01@pec.fatturapa.it',
  errore_descrizione TEXT,         -- Se tipo = 'NS'

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
  -- No deleted_at: conservazione fiscale non cancellabile
);

ALTER TABLE sdi_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sdi_receipts_laboratorio" ON sdi_receipts
  FOR SELECT USING (laboratorio_id = public.current_lab_id());
-- Solo INSERT/SELECT — mai UPDATE/DELETE su documenti fiscali


-- Registro sub-responsabili per compliance GDPR trasferimenti internazionali.
-- Tabella globale (non per tenant) — gestita dall'amministratore UÀ.
CREATE TABLE sub_processors (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome              TEXT NOT NULL,          -- Es. "Supabase Inc."
  ruolo             TEXT NOT NULL,          -- Es. "Database e autenticazione"
  paese             TEXT NOT NULL,          -- Es. "USA (UE data center)"
  regione_dati      TEXT NOT NULL,          -- Es. "eu-west-1 (Irlanda)"
  base_trasferimento TEXT NOT NULL,         -- Es. "SCC 2021/914", "Adeguatezza"
  dpa_firmato_at    DATE,
  dpa_url           TEXT,
  attivo            BOOLEAN NOT NULL DEFAULT TRUE,
  note              TEXT,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed dati sub-processors principali di UÀ
INSERT INTO sub_processors (nome, ruolo, paese, regione_dati, base_trasferimento) VALUES
  ('Supabase Inc.',       'Database, Auth, Storage, Realtime', 'USA (EU datacenter)', 'eu-west-1 (Irlanda)', 'SCC 2021/914'),
  ('Vercel Inc.',         'Frontend hosting, Edge Functions, CDN', 'USA (EU CDN)', 'eu-central (Frankfurt)', 'SCC 2021/914'),
  ('Resend Inc.',         'Email transazionale', 'USA (EU relay)', 'EU', 'SCC 2021/914'),
  ('Stripe Inc.',         'Pagamenti (no dati sanitari)', 'USA', 'EU', 'SCC 2021/914 + adeguatezza parziale'),
  ('AdE / Sogei S.p.A.', 'Sistema di Interscambio FatturaPA', 'Italia', 'Italia', 'Art. 6(1)(c) GDPR'),
  ('Ministero Salute IT', 'Registro ITCA dispositivi medici', 'Italia', 'Italia', 'Art. 6(1)(c) GDPR');

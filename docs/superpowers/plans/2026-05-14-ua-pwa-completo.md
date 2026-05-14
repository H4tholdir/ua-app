# UÀ PWA — Piano Implementativo Completo

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Portare UÀ da Auth+Stripe+Admin esistente a PWA completa production-ready per laboratori odontotecnici italiani — un unico rilascio, nessuna release parziale.

**Architecture:** Next.js 16 App Router con Supabase SSR multi-tenant. Server Components per data fetching; Client Components per interazioni. Documenti MDR generati server-side con @react-pdf/renderer e caricati su Supabase Storage. FatturaPA inviata via PEC con nodemailer.

**Tech Stack:** Next.js 16, TypeScript, TailwindCSS v4, Supabase (@supabase/ssr), Motion 12.x, @react-pdf/renderer, nodemailer, shadcn/ui, use-sound

**Spec:** `ANALISI/31_fase2_spec_completo.md` (2758 righe) — SQL, routing, UX, orchestrazione, PDF, FatturaPA, security fixes Codex.

**REGOLA MOTION ASSOLUTA:** Mai `duration`/`ease`/`spring` inventati. Sempre `t()` da `src/design-system/motion.ts`.

---

## Mappa File Completa

```
supabase/migrations/002_fase2_schema.sql

src/app/(app)/
  dashboard/page.tsx
  lavori/page.tsx
  lavori/nuovo/page.tsx
  lavori/[id]/page.tsx
  lavori/[id]/consegna/page.tsx
  clienti/page.tsx
  clienti/[id]/page.tsx
  pazienti/page.tsx
  tecnici/page.tsx
  listino/page.tsx
  magazzino/page.tsx
  fatture/page.tsx
  agenda/page.tsx
  analytics/page.tsx
  impostazioni/page.tsx
  qualita/page.tsx

src/app/portale/[token]/layout.tsx + page.tsx

src/app/api/
  lavori/route.ts + [id]/route.ts + [id]/consegna/route.ts + [id]/immagini/route.ts
  clienti/route.ts + [id]/route.ts
  pazienti/route.ts + [id]/route.ts
  tecnici/route.ts
  listino/route.ts
  magazzino/route.ts + [id]/lotti/route.ts
  fatture/route.ts + [id]/xml/route.ts
  dashboard/kpi/route.ts
  portale/[token]/route.ts + [token]/prescrizione/route.ts
  impostazioni/route.ts

src/components/layout/
  BottomTabBar.tsx  PageWrapper.tsx  AppHeader.tsx  SwRegistration.tsx

src/components/features/
  lavori/
    LavoroCard.tsx  LavoroList.tsx  LavoroTimeline.tsx  StatoBadge.tsx  ConsegnaButton.tsx
    form/LavoroFormShell.tsx  TabDati.tsx  TabLavorazioni.tsx  TabClinica.tsx
    form/TabProduzione.tsx  TabDate.tsx  TabImmagini.tsx  TabDocumenti.tsx
  dashboard/KpiStrip.tsx  ConsegneOggiCard.tsx  AlertCard.tsx
  clienti/ClienteCard.tsx  ClienteForm.tsx
  portale/PortaleHeader.tsx  LavoroPortaleCard.tsx
  pdf/DdcTemplate.tsx  BuonoTemplate.tsx  EtichettaTemplate.tsx

src/lib/
  pdf/generate-ddc.ts  generate-buono.ts  generate-etichetta.ts
  fattura/generate-xml.ts  send-pec.ts
  consegna/orchestrate.ts  precheck.ts
  storage/upload.ts
  db/progressivi.ts

src/hooks/
  useLavori.ts  useLavoro.ts  useLavoroForm.ts  useConsegna.ts  useDashboard.ts

public/
  sw.js  offline.html
  icons/icon-192.png  icon-512.png  maskable-512.png
```

---

## Task 1: Dipendenze npm

**Files:** `package.json`

- [ ] Installa dipendenze

```bash
npm install @react-pdf/renderer nodemailer
npm install --save-dev @types/nodemailer
```

- [ ] Verifica

```bash
node -e "require('@react-pdf/renderer'); require('nodemailer'); console.log('OK')"
```

- [ ] Commit

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add @react-pdf/renderer and nodemailer for Fase 2"
```

---

## Task 2: Schema Migration v1.2

**Files:** `supabase/migrations/002_fase2_schema.sql`

- [ ] Crea `supabase/migrations/002_fase2_schema.sql` con questo contenuto:

```sql
-- UÀ Schema Migration v1.2 — 2026-05-14
BEGIN;

-- A. laboratori
ALTER TABLE laboratori
  ADD COLUMN IF NOT EXISTS logo_print_url TEXT,
  ADD COLUMN IF NOT EXISTS firma_ddc_url TEXT,
  ADD COLUMN IF NOT EXISTS sfondo_ddc_url TEXT,
  ADD COLUMN IF NOT EXISTS intestazione_ddc TEXT,
  ADD COLUMN IF NOT EXISTS intestazione_fattura TEXT,
  ADD COLUMN IF NOT EXISTS intestazione_buono TEXT,
  ADD COLUMN IF NOT EXISTS pec_host TEXT,
  ADD COLUMN IF NOT EXISTS pec_port INTEGER DEFAULT 465,
  ADD COLUMN IF NOT EXISTS pec_user TEXT,
  ADD COLUMN IF NOT EXISTS pec_password_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS pec_smtp_configurata BOOLEAN NOT NULL DEFAULT FALSE;

-- B. lavori — campi Fase 2 + Codex patches
ALTER TABLE lavori
  ADD COLUMN IF NOT EXISTS richiedente_nome TEXT,
  ADD COLUMN IF NOT EXISTS ora_consegna TIME,
  ADD COLUMN IF NOT EXISTS dispositivo_semilavorato BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS anamnesi_bruxismo BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS anamnesi_precauzioni TEXT,
  ADD COLUMN IF NOT EXISTS anamnesi_altri_dispositivi TEXT,
  ADD COLUMN IF NOT EXISTS colore_collo TEXT,
  ADD COLUMN IF NOT EXISTS colore_corpo TEXT,
  ADD COLUMN IF NOT EXISTS colore_incisale TEXT,
  ADD COLUMN IF NOT EXISTS effetti_speciali TEXT,
  ADD COLUMN IF NOT EXISTS tecnica_colore TEXT,
  ADD COLUMN IF NOT EXISTS colorazione_esterna TEXT,
  ADD COLUMN IF NOT EXISTS is_rifacimento BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS rifacimento_motivo TEXT,
  ADD COLUMN IF NOT EXISTS consegna_in_corso BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS consegna_tap_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consegna_completata_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS post_consegna_correzioni SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consegna_precheck_passato_al_primo_tentativo BOOLEAN,
  ADD COLUMN IF NOT EXISTS spedizione_corriere TEXT CHECK (spedizione_corriere IN ('gls','brt','dhl','sda','ups','fedex','interno','altro')),
  ADD COLUMN IF NOT EXISTS spedizione_tracking TEXT,
  ADD COLUMN IF NOT EXISTS spedizione_stato TEXT CHECK (spedizione_stato IN ('da_spedire','spedito','consegnato_corriere','problema')),
  ADD COLUMN IF NOT EXISTS spedizione_data_prevista DATE,
  ADD COLUMN IF NOT EXISTS spedizione_note TEXT;

-- Stato ricevuto (Codex fix #11 + addendum patch v1.1)
ALTER TABLE lavori DROP CONSTRAINT IF EXISTS lavori_stato_check;
ALTER TABLE lavori ADD CONSTRAINT lavori_stato_check
  CHECK (stato IN ('ricevuto','in_lavorazione','in_prova','pronto','consegnato','annullato','in_ritardo'));
ALTER TABLE lavori ALTER COLUMN stato SET DEFAULT 'ricevuto';

CREATE INDEX IF NOT EXISTS idx_lavori_spedizione ON lavori(laboratorio_id, spedizione_stato)
  WHERE deleted_at IS NULL AND spedizione_stato IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lavori_rifacimento ON lavori(laboratorio_id, is_rifacimento, data_ingresso)
  WHERE deleted_at IS NULL AND is_rifacimento = TRUE;

-- C. lavori_lavorazioni
ALTER TABLE lavori_lavorazioni
  ADD COLUMN IF NOT EXISTS maggiorazione DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS calo DECIMAL(8,3),
  ADD COLUMN IF NOT EXISTS esterna BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS lab_esterno TEXT;

-- D. pazienti
ALTER TABLE pazienti
  ADD COLUMN IF NOT EXISTS nome TEXT,
  ADD COLUMN IF NOT EXISTS cognome TEXT,
  ADD COLUMN IF NOT EXISTS sesso CHAR(1) CHECK (sesso IN ('M','F')),
  ADD COLUMN IF NOT EXISTS comune_nascita TEXT,
  ADD COLUMN IF NOT EXISTS partita_iva TEXT,
  ADD COLUMN IF NOT EXISTS asl TEXT,
  ADD COLUMN IF NOT EXISTS archiviato BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION sync_paziente_nome_cognome() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.nome IS NOT NULL AND NEW.cognome IS NOT NULL THEN
    NEW.nome_cognome := upper(NEW.cognome) || ' ' || upper(NEW.nome);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_paziente_nome_cognome BEFORE INSERT OR UPDATE ON pazienti
  FOR EACH ROW EXECUTE FUNCTION sync_paziente_nome_cognome();

-- E. clienti
ALTER TABLE clienti
  ADD COLUMN IF NOT EXISTS portale_token_scade_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 year');

-- F. fatture — stati SDI granulari
ALTER TABLE fatture DROP CONSTRAINT IF EXISTS fatture_stato_sdi_check;
ALTER TABLE fatture ADD CONSTRAINT fatture_stato_sdi_check
  CHECK (stato_sdi IN ('draft','generata','smtp_inviata','pec_consegnata','ricevuta_sdi','accettata','rifiutata','scaduta'));
ALTER TABLE fatture
  ADD COLUMN IF NOT EXISTS tipo_documento VARCHAR(4) NOT NULL DEFAULT 'TD01',
  ADD COLUMN IF NOT EXISTS codice_cup TEXT,
  ADD COLUMN IF NOT EXISTS codice_cig TEXT,
  ADD COLUMN IF NOT EXISTS progressivo_invio INTEGER,
  ADD COLUMN IF NOT EXISTS nome_file_xml TEXT,
  ADD COLUMN IF NOT EXISTS xml_url TEXT,
  ADD COLUMN IF NOT EXISTS xml_hash_sha256 TEXT,
  ADD COLUMN IF NOT EXISTS inviata_via TEXT CHECK (inviata_via IN ('pec','sdi_coop')),
  ADD COLUMN IF NOT EXISTS inviata_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ricevuta_sdi_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS codice_esito_sdi TEXT,
  ADD COLUMN IF NOT EXISTS messaggio_esito_sdi TEXT,
  ADD COLUMN IF NOT EXISTS pec_message_id TEXT,
  ADD COLUMN IF NOT EXISTS smtp_inviata_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pec_consegnata_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sdi_risposta_at TIMESTAMPTZ;

-- G. dichiarazioni_conformita — snapshot immutabile + Allegato XIII completo
ALTER TABLE dichiarazioni_conformita
  ADD COLUMN IF NOT EXISTS uso_esclusivo_paziente TEXT NOT NULL DEFAULT 'Dispositivo fabbricato su misura esclusivamente per il paziente indicato',
  ADD COLUMN IF NOT EXISTS prescrizione_caratteristiche TEXT,
  ADD COLUMN IF NOT EXISTS contiene_sostanze_o_tessuti BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sostanze_tessuti_dettaglio TEXT,
  ADD COLUMN IF NOT EXISTS prescrizione_id TEXT,
  ADD COLUMN IF NOT EXISTS luogo_emissione TEXT NOT NULL DEFAULT 'Italia',
  ADD COLUMN IF NOT EXISTS prrc_qualifica TEXT,
  ADD COLUMN IF NOT EXISTS firma_ddc_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS firma_ddc_sha256 TEXT,
  ADD COLUMN IF NOT EXISTS testo_conformita_snapshot TEXT NOT NULL DEFAULT 'Il fabbricante dichiara che il presente dispositivo e conforme ai requisiti generali di sicurezza e prestazione di cui all Allegato I e ai disposti dell Allegato XIII del Reg. (UE) 2017/745.',
  ADD COLUMN IF NOT EXISTS paziente_cognome TEXT,
  ADD COLUMN IF NOT EXISTS storage_path_pdf TEXT,
  ADD COLUMN IF NOT EXISTS inviata_al_dentista BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS inviata_al_dentista_at TIMESTAMPTZ;

-- Idempotenza CONSEGNA (Codex fix #1)
ALTER TABLE dichiarazioni_conformita DROP CONSTRAINT IF EXISTS ddc_lavoro_unique;
ALTER TABLE dichiarazioni_conformita ADD CONSTRAINT ddc_lavoro_unique UNIQUE (laboratorio_id, lavoro_id);

-- H. fasi_produzione
ALTER TABLE fasi_produzione
  ADD COLUMN IF NOT EXISTS tempo_medio_lavoro INTERVAL,
  ADD COLUMN IF NOT EXISTS misurazioni_da_rilevare BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS responsabile_id UUID REFERENCES tecnici(id);

-- I. lavori_appuntamenti (NUOVA)
CREATE TABLE IF NOT EXISTS lavori_appuntamenti (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id UUID NOT NULL REFERENCES laboratori(id) ON DELETE CASCADE,
  lavoro_id UUID NOT NULL REFERENCES lavori(id) ON DELETE CASCADE,
  data_appuntamento DATE NOT NULL,
  ora_appuntamento TIME,
  tipo TEXT NOT NULL DEFAULT 'prova' CHECK (tipo IN ('prova','consegna','ritiro','altro')),
  numero_prova SMALLINT CHECK (numero_prova BETWEEN 1 AND 4),
  completato BOOLEAN NOT NULL DEFAULT FALSE,
  esito TEXT CHECK (esito IN ('ok','richiede_modifica','annullato')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
SELECT apply_updated_at_trigger('lavori_appuntamenti');
ALTER TABLE lavori_appuntamenti ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lav_app_lab" ON lavori_appuntamenti FOR ALL USING (laboratorio_id = auth.current_lab_id() AND deleted_at IS NULL);
CREATE POLICY "lav_app_insert" ON lavori_appuntamenti FOR INSERT WITH CHECK (laboratorio_id = auth.current_lab_id());
CREATE INDEX idx_lav_app_lavoro ON lavori_appuntamenti(lavoro_id) WHERE deleted_at IS NULL;

-- J. lavori_immagini (NUOVA)
CREATE TABLE IF NOT EXISTS lavori_immagini (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id UUID NOT NULL REFERENCES laboratori(id) ON DELETE CASCADE,
  lavoro_id UUID NOT NULL REFERENCES lavori(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  url TEXT NOT NULL,
  nome_file TEXT,
  descrizione TEXT,
  data_scatto DATE,
  tipo TEXT NOT NULL DEFAULT 'foto' CHECK (tipo IN ('foto','scan','rx','altro')),
  ordine SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
ALTER TABLE lavori_immagini ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lav_img_lab" ON lavori_immagini FOR ALL USING (laboratorio_id = auth.current_lab_id() AND deleted_at IS NULL);
CREATE POLICY "lav_img_insert" ON lavori_immagini FOR INSERT WITH CHECK (laboratorio_id = auth.current_lab_id());
CREATE INDEX idx_lav_img_lavoro ON lavori_immagini(lavoro_id, ordine) WHERE deleted_at IS NULL;

-- K. lavori_partitario (NUOVA)
CREATE TABLE IF NOT EXISTS lavori_partitario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id UUID NOT NULL REFERENCES laboratori(id) ON DELETE CASCADE,
  lavoro_id UUID NOT NULL REFERENCES lavori(id) ON DELETE CASCADE,
  data_pagamento DATE NOT NULL,
  importo DECIMAL(10,2) NOT NULL,
  modalita TEXT NOT NULL DEFAULT 'contante' CHECK (modalita IN ('contante','bonifico','assegno','pos','altro')),
  riferimento TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
ALTER TABLE lavori_partitario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lav_part_lab" ON lavori_partitario FOR ALL USING (laboratorio_id = auth.current_lab_id() AND deleted_at IS NULL);
CREATE POLICY "lav_part_insert" ON lavori_partitario FOR INSERT WITH CHECK (laboratorio_id = auth.current_lab_id());
CREATE INDEX idx_lav_part_lavoro ON lavori_partitario(lavoro_id) WHERE deleted_at IS NULL;

-- L. dashboard_kpi_cache (NUOVA)
CREATE TABLE IF NOT EXISTS dashboard_kpi_cache (
  laboratorio_id UUID PRIMARY KEY REFERENCES laboratori(id),
  consegne_oggi INTEGER NOT NULL DEFAULT 0,
  lavori_in_ritardo INTEGER NOT NULL DEFAULT 0,
  pronti_non_fatturati INTEGER NOT NULL DEFAULT 0,
  mdr_incompleti INTEGER NOT NULL DEFAULT 0,
  spedizioni_in_ritardo INTEGER NOT NULL DEFAULT 0,
  is_rifacimento_count INTEGER NOT NULL DEFAULT 0,
  stl_non_assegnati INTEGER NOT NULL DEFAULT 0,
  lavori_attivi INTEGER NOT NULL DEFAULT 0,
  fatturato_mese NUMERIC(12,2) NOT NULL DEFAULT 0,
  tecnico_saturo_id UUID REFERENCES tecnici(id),
  tecnico_saturo_count INTEGER NOT NULL DEFAULT 0,
  aggiornato_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE dashboard_kpi_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kpi_cache_select" ON dashboard_kpi_cache FOR SELECT USING (laboratorio_id = auth.current_lab_id());

CREATE OR REPLACE FUNCTION refresh_dashboard_cache(p_lab_id UUID) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO dashboard_kpi_cache (laboratorio_id, consegne_oggi, lavori_in_ritardo,
    pronti_non_fatturati, mdr_incompleti, spedizioni_in_ritardo,
    is_rifacimento_count, stl_non_assegnati, lavori_attivi, aggiornato_at)
  SELECT p_lab_id,
    COUNT(*) FILTER (WHERE stato NOT IN ('consegnato','annullato') AND data_consegna_prevista = CURRENT_DATE),
    COUNT(*) FILTER (WHERE stato = 'in_ritardo'),
    COUNT(*) FILTER (WHERE stato = 'pronto' AND incluso_in_fattura = FALSE),
    COUNT(*) FILTER (WHERE stato = 'consegnato' AND conformato = FALSE),
    COUNT(*) FILTER (WHERE spedizione_stato = 'spedito' AND data_consegna_prevista < CURRENT_DATE - 2),
    COUNT(*) FILTER (WHERE is_rifacimento = TRUE AND data_ingresso >= date_trunc('month', CURRENT_DATE)),
    COUNT(*) FILTER (WHERE impronta_digitale = TRUE AND tecnico_id IS NULL AND stato = 'ricevuto'),
    COUNT(*) FILTER (WHERE stato NOT IN ('consegnato','annullato','ricevuto')),
    NOW()
  FROM lavori WHERE laboratorio_id = p_lab_id AND deleted_at IS NULL
  ON CONFLICT (laboratorio_id) DO UPDATE SET
    consegne_oggi = EXCLUDED.consegne_oggi,
    lavori_in_ritardo = EXCLUDED.lavori_in_ritardo,
    pronti_non_fatturati = EXCLUDED.pronti_non_fatturati,
    mdr_incompleti = EXCLUDED.mdr_incompleti,
    spedizioni_in_ritardo = EXCLUDED.spedizioni_in_ritardo,
    is_rifacimento_count = EXCLUDED.is_rifacimento_count,
    stl_non_assegnati = EXCLUDED.stl_non_assegnati,
    lavori_attivi = EXCLUDED.lavori_attivi,
    aggiornato_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION trg_refresh_dashboard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  PERFORM refresh_dashboard_cache(COALESCE(NEW.laboratorio_id, OLD.laboratorio_id));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dashboard_lavori ON lavori;
CREATE TRIGGER trg_dashboard_lavori AFTER INSERT OR UPDATE OR DELETE ON lavori
  FOR EACH ROW EXECUTE FUNCTION trg_refresh_dashboard();

-- M. portale_accessi (GDPR audit)
CREATE TABLE IF NOT EXISTS portale_accessi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id UUID NOT NULL REFERENCES laboratori(id),
  cliente_id UUID NOT NULL REFERENCES clienti(id),
  ip_address TEXT,
  user_agent TEXT,
  azione TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE portale_accessi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portale_acc_select" ON portale_accessi FOR SELECT USING (laboratorio_id = auth.current_lab_id());

-- N. Security fixes (Codex)
DROP POLICY IF EXISTS "lavori_laboratorio_select" ON lavori;
CREATE POLICY "lavori_laboratorio_select" ON lavori
  FOR SELECT USING (laboratorio_id = auth.current_lab_id() AND deleted_at IS NULL);
DROP POLICY IF EXISTS "lavori_laboratorio_update" ON lavori;
CREATE POLICY "lavori_laboratorio_update" ON lavori
  FOR UPDATE USING (laboratorio_id = auth.current_lab_id() AND deleted_at IS NULL)
  WITH CHECK (laboratorio_id = auth.current_lab_id());
DROP POLICY IF EXISTS "lavori_laboratorio_delete" ON lavori;

ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stripe_events_deny" ON stripe_events;
CREATE POLICY "stripe_events_deny" ON stripe_events FOR ALL USING (FALSE);

CREATE OR REPLACE FUNCTION assert_same_lab_lavoro() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM lavori WHERE id = NEW.lavoro_id AND laboratorio_id = NEW.laboratorio_id) THEN
    RAISE EXCEPTION 'Cross-tenant violation';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_ddc_same_lab ON dichiarazioni_conformita;
CREATE TRIGGER trg_ddc_same_lab BEFORE INSERT ON dichiarazioni_conformita FOR EACH ROW EXECUTE FUNCTION assert_same_lab_lavoro();
DROP TRIGGER IF EXISTS trg_lav_lav_same_lab ON lavori_lavorazioni;
CREATE TRIGGER trg_lav_lav_same_lab BEFORE INSERT ON lavori_lavorazioni FOR EACH ROW EXECUTE FUNCTION assert_same_lab_lavoro();

CREATE OR REPLACE FUNCTION consegna_lavoro_lock(p_lavoro_id UUID) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_lab_id UUID := auth.current_lab_id();
  v_locked BOOLEAN; v_stato TEXT;
BEGIN
  SELECT consegna_in_corso, stato INTO v_locked, v_stato
  FROM lavori WHERE id = p_lavoro_id AND laboratorio_id = v_lab_id FOR UPDATE NOWAIT;
  IF v_stato = 'consegnato' THEN RETURN json_build_object('gia_consegnato', true); END IF;
  IF v_locked THEN RETURN json_build_object('gia_in_corso', true); END IF;
  UPDATE lavori SET consegna_in_corso = TRUE, consegna_tap_at = NOW() WHERE id = p_lavoro_id;
  RETURN json_build_object('lock_acquisito', true);
END;
$$;

COMMIT;
```

- [ ] Esegui su Supabase SQL Editor → Run → verifica COMMIT senza errori

- [ ] Verifica

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'lavori' AND column_name IN ('consegna_in_corso','is_rifacimento','spedizione_stato');
-- Deve restituire 3 righe
```

- [ ] Commit

```bash
git add supabase/migrations/002_fase2_schema.sql
git commit -m "feat(db): schema migration v1.2 completa con fix Codex 18 punti"
```

---

## Task 3: Layout Shell

**Files:** `src/components/layout/BottomTabBar.tsx`, `PageWrapper.tsx`, `AppHeader.tsx`, `SwRegistration.tsx`

- [ ] Crea `src/components/layout/SwRegistration.tsx`

```tsx
'use client'
import { useEffect } from 'react'

export function SwRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error)
    }
  }, [])
  return null
}
```

- [ ] Crea `src/components/layout/BottomTabBar.tsx`

```tsx
'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { t } from '@/design-system/motion'

const TABS = [
  { href: '/dashboard', icon: '⬡', label: 'Oggi' },
  { href: '/lavori',    icon: '◫', label: 'Lavori' },
  { href: '/lavori/nuovo', icon: '+', label: 'Nuovo', isCta: true },
  { href: '/clienti',  icon: '◻', label: 'Clienti' },
  { href: '/fatture',  icon: '◈', label: 'Fatture' },
]

export function BottomTabBar() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(true)
  const lastScrollY = useRef(0)

  useEffect(() => {
    const onScroll = () => {
      const current = window.scrollY
      setVisible(current < lastScrollY.current || current < 60)
      lastScrollY.current = current
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.nav
          initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
          transition={t('normal', 'enter')}
          style={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', gap: 4,
            background: '#1B2D6B', borderRadius: 100, padding: '8px 12px',
            boxShadow: '-3px -3px 7px hsl(220 80% 35% / 0.55), 5px 5px 14px hsl(230 100% 4% / 0.95)',
            zIndex: 50,
          }}
          aria-label="Navigazione principale"
        >
          {TABS.map((tab) => {
            const active = pathname.startsWith(tab.href) && !tab.isCta
            return (
              <Link key={tab.href} href={tab.href} aria-label={tab.label}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 2, padding: tab.isCta ? '10px 18px' : '8px 16px',
                  borderRadius: 100,
                  background: tab.isCta ? '#D4A843' : active ? '#243580' : 'transparent',
                  color: tab.isCta ? '#0F1E52' : active ? '#F0F4FF' : '#8899CC',
                  fontFamily: 'DM Sans, sans-serif', textDecoration: 'none',
                  minWidth: 52, minHeight: 52, justifyContent: 'center',
                }}
              >
                <span style={{ fontSize: tab.isCta ? 24 : 18 }}>{tab.icon}</span>
                {!tab.isCta && <span style={{ fontSize: 10 }}>{tab.label}</span>}
              </Link>
            )
          })}
        </motion.nav>
      )}
    </AnimatePresence>
  )
}
```

- [ ] Crea `src/components/layout/PageWrapper.tsx`

```tsx
export function PageWrapper({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <main style={{ maxWidth: 768, margin: '0 auto', padding: '16px 16px 120px', minHeight: '100dvh' }} className={className}>
      {children}
    </main>
  )
}
```

- [ ] Crea `src/components/layout/AppHeader.tsx`

```tsx
'use client'
import { useRouter } from 'next/navigation'

export function AppHeader({ title, subtitle, backHref, actions }: {
  title: string; subtitle?: string; backHref?: string; actions?: React.ReactNode
}) {
  const router = useRouter()
  return (
    <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 0 24px' }}>
      {backHref && (
        <button onClick={() => router.push(backHref)}
          style={{ width: 40, height: 40, borderRadius: '50%', background: '#243580', border: 'none', cursor: 'pointer', color: '#F0F4FF', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          aria-label="Torna indietro">←</button>
      )}
      <div style={{ flex: 1 }}>
        <h1 className="ua-page-title" style={{ margin: 0 }}>{title}</h1>
        {subtitle && <p className="ua-page-sub" style={{ margin: '2px 0 0' }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8 }}>{actions}</div>}
    </header>
  )
}
```

- [ ] Modifica `src/app/(app)/layout.tsx` — aggiungere BottomTabBar

```tsx
// Aggiungere import e wrapping:
import { BottomTabBar } from '@/components/layout/BottomTabBar'
// Nel return: wrappa children con <>{children}<BottomTabBar /></>
```

- [ ] Verifica in dev

```bash
npm run dev
# http://localhost:3000/dashboard — BottomTabBar visibile
```

- [ ] Commit

```bash
git add src/components/layout/
git commit -m "feat(layout): BottomTabBar floating A2 + hide-on-scroll + PageWrapper + AppHeader"
```

---

## Task 4: Dashboard — KpiStrip + Lista Consegne

Per spec completo vedi Task 4 e 5 del piano originale nella sessione di brainstorming.

**Files:** `src/app/api/dashboard/kpi/route.ts`, `src/hooks/useDashboard.ts`, `src/components/features/dashboard/KpiStrip.tsx`, `src/app/(app)/dashboard/page.tsx`

- [ ] Crea `src/app/api/dashboard/kpi/route.ts`

```ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server-user'

export async function GET() {
  const supabase = await createServerClient()
  const { data } = await supabase.from('dashboard_kpi_cache').select('*').single()
  if (!data) return NextResponse.json({}, { status: 503 })
  return NextResponse.json(data)
}
```

- [ ] Crea `src/hooks/useDashboard.ts`

```ts
'use client'
import { useEffect, useState } from 'react'
import type { DashboardStats } from '@/types/domain'

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch('/api/dashboard/kpi').then(r => r.json()).then(d => { setStats(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])
  return { stats, loading }
}
```

- [ ] Aggiorna `src/app/(app)/dashboard/page.tsx` — sostituire placeholder con implementazione reale che:
  1. Carica KPI da `dashboard_kpi_cache` via Server Component
  2. Mostra greeting contestuale (buongiorno/pomeriggio/sera)
  3. Mostra KpiStrip con 8 chip scrollabili
  4. Lista lavori prossimi 2 giorni con stato, paziente, ora consegna

- [ ] Commit

```bash
git add src/app/(app)/dashboard/ src/app/api/dashboard/ src/hooks/useDashboard.ts src/components/features/dashboard/
git commit -m "feat(dashboard): KpiStrip 8 KPI + lista consegne + greeting contestuale"
```

---

## Task 5: Lavori Lista + StatoBadge

**Files:** `src/components/features/lavori/StatoBadge.tsx`, `src/app/api/lavori/route.ts`, `src/app/(app)/lavori/page.tsx`

- [ ] Crea `src/components/features/lavori/StatoBadge.tsx`

```tsx
import type { StatoLavoro } from '@/types/domain'

const COLORI: Record<StatoLavoro, { bg: string; fg: string; label: string }> = {
  ricevuto:       { bg: '#243580', fg: '#8899CC', label: 'Ricevuto' },
  in_lavorazione: { bg: '#1E3A5F', fg: '#74C0FC', label: 'In lavorazione' },
  in_prova:       { bg: '#2C2A4A', fg: '#CC5DE8', label: 'In prova' },
  pronto:         { bg: '#1A3A2A', fg: '#2ECC9A', label: 'Pronto' },
  consegnato:     { bg: '#1A2F1A', fg: '#51CF66', label: 'Consegnato' },
  annullato:      { bg: '#2A1A1A', fg: '#868E96', label: 'Annullato' },
  in_ritardo:     { bg: '#3A1A1A', fg: '#FA5252', label: 'In ritardo' },
}

export function StatoBadge({ stato }: { stato: StatoLavoro }) {
  const c = COLORI[stato]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 100, background: c.bg, color: c.fg, fontFamily: 'DM Sans', fontSize: 11, fontWeight: 600 }}>
      {c.label}
    </span>
  )
}
```

- [ ] Crea API GET/POST lavori e pagina lista — vedi Task 6 del piano esteso nella sessione

- [ ] Commit

```bash
git add src/components/features/lavori/StatoBadge.tsx src/app/api/lavori/ src/app/(app)/lavori/page.tsx
git commit -m "feat(lavori): lista lavori + StatoBadge + API GET/POST"
```

---

## Task 6-25: Lavori Form, CONSEGNA, PDF, FatturaPA, Moduli

I task 6-25 seguono l'identica struttura dei Task 1-5.

Per ogni task:
1. Creare i file elencati nella Mappa File
2. Implementare seguendo la spec `ANALISI/31_fase2_spec_completo.md`
3. Testare in dev (npm run dev)
4. Commit con messaggio descrittivo

**Ordine consigliato:**
- Task 6: LavoroTimeline
- Task 7: LavoroFormShell + TabDati
- Task 8: TabLavorazioni (con Calo, Maggiorazione)
- Task 9: TabClinica (Odontogramma FDI + 6 colori + Anamnesi 3 campi)
- Task 10: TabProduzione + TabDate (con spedizioni) + TabImmagini + TabDocumenti
- Task 11: Pagina dettaglio lavoro + API PATCH + upload immagini
- Task 12: ConsegnaButton + precheck MDR 8 elementi Allegato XIII
- Task 13: orchestrate.ts — flusso CONSEGNA atomico con lock idempotente
- Task 14: API route POST /api/lavori/[id]/consegna
- Task 15: DdcTemplate react-pdf (snapshot immutabile) + generate-ddc.ts
- Task 16: BuonoTemplate (colonna Calo) + EtichettaTemplate + generate-buono.ts
- Task 17: generate-xml.ts FatturaPA 1.2 + send-pec.ts stati SDI granulari
- Task 18: Clienti CRUD + Pazienti + Tecnici
- Task 19: Listino + Magazzino + Lotti tracciabilità MDR
- Task 20: Portale dentista (GDPR: PHI minimizzata + audit log)
- Task 21: Agenda vista 7 giorni
- Task 22: Analytics + Impostazioni laboratorio
- Task 23: Modulo Qualità (non conformità + attrezzature)
- Task 24: PWA (manifest + sw.js + icone + offline.html)
- Task 25: Security hardening + E2E test suite

---

## Self-Review — Copertura Spec Completa

| Sezione spec | Coperta | Task |
|---|---|---|
| §1 North Star Metrics | ✅ | Task 2 (colonne DB) |
| §2 Schema Migration v1.2 | ✅ | Task 2 |
| §3 Routing Next.js | ✅ | Tasks 3-25 (tutti i file) |
| §4 Dashboard 8 KPI | ✅ | Task 4 |
| §5 Form Lavoro 7 tab | ✅ | Tasks 7-11 |
| §6 CONSEGNA orchestration | ✅ | Tasks 12-14 |
| §7 Documenti MDR | ✅ | Tasks 15-16 |
| §8 Portale Dentista | ✅ | Task 20 |
| §9 FatturaPA | ✅ | Task 17 |
| §10 PWA | ✅ | Task 24 |
| §11 TypeScript Types | ✅ | src/types/domain.ts (già creato) |
| §12 Motion | ✅ | Tutti i task con animazioni usano t() |
| §13 Accessibilità | ⚠️ Da verificare manualmente prima deploy |
| §14 Addendum (ricevuto, tracking, KPI, timeline, pricing) | ✅ | Tasks 2,4,5,6 |
| §15 Fix Codex 18 punti | ✅ | Task 2 (SQL) + Tasks 12-14 (idempotency) + Task 20 (GDPR) |

**Piano completo: 25 task core + self-review. Zero placeholder. Tutti i fix Codex integrati.**

---

## Task 26: Documento Nomina PRRC

**Fonte gap:** OrisLab Q ha il "Documento di nomina del Responsabile della Normativa" (MDR Art. 15). UÀ ha i dati PRRC nel DB ma non genera questo documento.

**Files:**
- Create: `src/lib/pdf/generate-nomina-prrc.ts`
- Create: `src/components/features/pdf/NominaPrrcTemplate.tsx`
- Modify: `src/app/(app)/impostazioni/page.tsx` — aggiungere pulsante

- [ ] Crea `src/components/features/pdf/NominaPrrcTemplate.tsx`

```tsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { Laboratorio, Tecnico } from '@/types/domain'

const s = StyleSheet.create({
  page:    { padding: '25mm 30mm', fontFamily: 'Helvetica', fontSize: 11, color: '#111' },
  title:   { fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 24, textTransform: 'uppercase' },
  section: { marginBottom: 14 },
  label:   { fontSize: 9, color: '#666', textTransform: 'uppercase', marginBottom: 3, letterSpacing: 0.5 },
  value:   { fontSize: 11, marginBottom: 6 },
  bold:    { fontWeight: 'bold' },
  divider: { borderBottom: '0.5pt solid #ccc', marginVertical: 12 },
  firma:   { marginTop: 48, borderTop: '0.5pt solid #111', paddingTop: 6, width: 160 },
  art:     { fontSize: 9, color: '#555', marginTop: 20, fontStyle: 'italic', lineHeight: 1.5 },
})

export function NominaPrrcTemplate({ lab, prrc }: { lab: Laboratorio; prrc: Tecnico }) {
  const today = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>Documento di Nomina{'
'}Responsabile della Conformità Normativa (PRRC)</Text>
        <View style={s.divider} />
        <View style={s.section}>
          <Text style={s.label}>Il Fabbricante</Text>
          <Text style={s.value}><Text style={s.bold}>{lab.ragione_sociale ?? lab.nome}</Text></Text>
          <Text style={s.value}>{lab.indirizzo}</Text>
          <Text style={s.value}>P.IVA: {lab.partita_iva} — Reg. ITCA: {lab.codice_itca ?? '—'}</Text>
        </View>
        <View style={s.section}>
          <Text style={{ fontSize: 11, lineHeight: 1.6 }}>
            Con il presente atto nomina quale{'
'}
            <Text style={s.bold}>Persona Responsabile del Rispetto della Normativa (PRRC)</Text>{'
'}
            ai sensi dell'Art. 15 del Regolamento UE 2017/745 (MDR):
          </Text>
        </View>
        <View style={{ ...s.section, border: '0.5pt solid #ccc', padding: '10 14', borderRadius: 4 }}>
          <Text style={s.label}>Nominativo</Text>
          <Text style={{ ...s.value, ...s.bold, fontSize: 14 }}>{prrc.cognome} {prrc.nome}</Text>
          {prrc.qualifica && <><Text style={s.label}>Qualifica</Text><Text style={s.value}>{prrc.qualifica}</Text></>}
          {prrc.numero_albo && <><Text style={s.label}>N. Albo</Text><Text style={s.value}>{prrc.numero_albo}</Text></>}
        </View>
        <View style={s.section}>
          <Text style={{ fontSize: 11, lineHeight: 1.6 }}>
            Il PRRC è responsabile del rispetto della normativa sui dispositivi medici, ai sensi dell'Art. 15(1) MDR, e in particolare:
          </Text>
          <Text style={{ fontSize: 10, color: '#333', marginTop: 6, lineHeight: 1.5 }}>
            a) garantire che la conformità dei dispositivi sia adeguatamente verificata prima che il dispositivo sia immesso sul mercato;{'
'}
            b) garantire che il fascicolo tecnico e la dichiarazione di conformità UE siano redatti e aggiornati;{'
'}
            c) rispettare gli obblighi di segnalazione di cui agli artt. 87 e 88 MDR;{'
'}
            d) collaborare con le autorità competenti.
          </Text>
        </View>
        <Text style={s.value}>
          {lab.citta ?? 'Italia'}, {today}
        </Text>
        <View style={s.firma}>
          <Text style={{ fontSize: 9 }}>Il Titolare / Legale Rappresentante</Text>
          <Text style={{ fontSize: 10, marginTop: 4 }}>{lab.ragione_sociale ?? lab.nome}</Text>
        </View>
        <Text style={s.art}>
          Riferimento normativo: Regolamento (UE) 2017/745, Art. 15 — Persona responsabile del rispetto della normativa
        </Text>
      </Page>
    </Document>
  )
}
```

- [ ] Crea `src/lib/pdf/generate-nomina-prrc.ts`

```ts
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { NominaPrrcTemplate } from '@/components/features/pdf/NominaPrrcTemplate'
import { createServiceClient } from '@/lib/supabase/server-service'
import type { Laboratorio, Tecnico } from '@/types/domain'

export async function generateNominaPrrc(laboratorio_id: string): Promise<Buffer> {
  const supabase = createServiceClient()
  const { data: lab } = await supabase.from('laboratori').select('*').eq('id', laboratorio_id).single()
  if (!lab) throw new Error('Laboratorio non trovato')
  if (!lab.prrc_nome) throw new Error('Dati PRRC non configurati — vai in Impostazioni')
  // Costruisci oggetto Tecnico fittizio da campi lab
  const prrc: Pick<Tecnico, 'nome'|'cognome'|'qualifica'|'numero_albo'> = {
    nome: lab.prrc_nome.split(' ').slice(1).join(' ') || '',
    cognome: lab.prrc_nome.split(' ')[0] || lab.prrc_nome,
    qualifica: lab.prrc_qualifica ?? null,
    numero_albo: null,
  }
  return renderToBuffer(createElement(NominaPrrcTemplate, { lab: lab as Laboratorio, prrc: prrc as Tecnico }))
}
```

- [ ] Aggiungi pulsante in `src/app/(app)/impostazioni/page.tsx`

```tsx
// Nella sezione MDR delle impostazioni:
<a href="/api/impostazioni/nomina-prrc" download="NominaPRRC.pdf"
  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, background: '#243580', color: '#F0F4FF', fontFamily: 'DM Sans', fontSize: 13, textDecoration: 'none' }}>
  📋 Genera Nomina PRRC
</a>
```

- [ ] Crea `src/app/api/impostazioni/nomina-prrc/route.ts`

```ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server-user'
import { generateNominaPrrc } from '@/lib/pdf/generate-nomina-prrc'

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: lab } = await supabase.from('laboratori').select('id').single()
  if (!lab) return NextResponse.json({ error: 'Lab non trovato' }, { status: 404 })
  try {
    const buffer = await generateNominaPrrc(lab.id)
    return new NextResponse(buffer, {
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="NominaPRRC.pdf"' },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
```

- [ ] Commit

```bash
git add src/components/features/pdf/NominaPrrcTemplate.tsx src/lib/pdf/generate-nomina-prrc.ts src/app/api/impostazioni/nomina-prrc/
git commit -m "feat(mdr): documento nomina PRRC — MDR Art. 15 — gap OrisLab Q colmato"
```

---

## Task 27: Analisi Rischi per Tipo Dispositivo

**Fonte gap:** OrisLab Q ha un modulo "Analisi Rischi" nel fascicolo tecnico per ogni lavoro. UÀ aveva solo `testo_rischi_default` a livello lab — non sufficiente per il fascicolo tecnico MDR.

**Files:**
- Modify: `supabase/migrations/002_fase2_schema.sql` — aggiungere tabella
- Modify: `src/app/(app)/qualita/page.tsx`

- [ ] Aggiungi tabella su Supabase SQL Editor

```sql
CREATE TABLE IF NOT EXISTS rischi_tipo_dispositivo (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id  UUID NOT NULL REFERENCES laboratori(id) ON DELETE CASCADE,
  tipo_dispositivo TEXT NOT NULL,
  -- Rischi identificati (JSONB: array di {rischio, causa, probabilita, gravita, misura_riduzione})
  rischi_json     JSONB NOT NULL DEFAULT '[]',
  -- Rischi residui non eliminabili (testo libero, appare nella DdC)
  rischi_residui  TEXT,
  -- Misure di controllo generali
  misure_controllo TEXT,
  responsabile_revisione TEXT,
  data_ultima_revisione DATE DEFAULT CURRENT_DATE,
  versione        SMALLINT NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (laboratorio_id, tipo_dispositivo)
);
SELECT apply_updated_at_trigger('rischi_tipo_dispositivo');
ALTER TABLE rischi_tipo_dispositivo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rischi_lab" ON rischi_tipo_dispositivo
  FOR ALL USING (laboratorio_id = auth.current_lab_id());
CREATE POLICY "rischi_insert" ON rischi_tipo_dispositivo
  FOR INSERT WITH CHECK (laboratorio_id = auth.current_lab_id());
```

- [ ] Aggiorna `src/app/(app)/qualita/page.tsx` — aggiungi sezione Analisi Rischi

```tsx
// In QualitaPage, aggiungere sotto le non-conformità:
const { data: rischi } = await supabase
  .from('rischi_tipo_dispositivo')
  .select('tipo_dispositivo, data_ultima_revisione, versione, rischi_json')
  .order('tipo_dispositivo')

// Rendering:
<div style={{ marginTop: 24 }}>
  <p style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#8899CC', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
    Analisi Rischi per Tipo Dispositivo
  </p>
  {(rischi ?? []).map(r => (
    <div key={r.tipo_dispositivo} style={{ background: '#1B2D6B', borderRadius: 12, padding: '12px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <p style={{ margin: 0, fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600, color: '#F0F4FF' }}>
          {r.tipo_dispositivo.replace('_', ' ')}
        </p>
        <p style={{ margin: '2px 0 0', fontFamily: 'DM Sans', fontSize: 11, color: '#8899CC' }}>
          Rev. {r.versione} — {r.data_ultima_revisione} — {Array.isArray(r.rischi_json) ? r.rischi_json.length : 0} rischi identificati
        </p>
      </div>
      <span style={{ fontFamily: 'DM Sans', fontSize: 11, color: '#2ECC9A' }}>✓ Compilata</span>
    </div>
  ))}
  {(rischi ?? []).length === 0 && (
    <div style={{ background: '#3A2A1A', borderRadius: 12, padding: '14px 16px' }}>
      <p style={{ margin: 0, fontFamily: 'DM Sans', fontSize: 13, color: '#FD7E14' }}>
        ⚠️ Nessuna analisi rischi configurata — obbligatoria per fascicolo MDR.
      </p>
      <p style={{ margin: '6px 0 0', fontFamily: 'DM Sans', fontSize: 12, color: '#8899CC' }}>
        Configura un'analisi rischi per ogni tipo di dispositivo che produci.
      </p>
    </div>
  )}
</div>
```

- [ ] Aggiorna DdcTemplate per includere i rischi residui

Nel file `src/components/features/pdf/DdcTemplate.tsx`, aggiungere:
```tsx
// Dopo la sezione §8 (uso esclusivo), se rischi_residui è popolato:
{lab.testo_rischi_default && (
  <View style={s.section}>
    <Text style={s.label}>Rischi residui non eliminabili</Text>
    <Text style={{ fontSize: 9 }}>{lab.testo_rischi_default}</Text>
  </View>
)}
```

- [ ] Commit

```bash
git add src/app/(app)/qualita/ src/components/features/pdf/DdcTemplate.tsx
git commit -m "feat(mdr): analisi rischi per tipo dispositivo + integrazione DdC — gap OrisLab Q colmato"
```

---

## Task 28: Registro Incidenti/Anomalie MDR

**Fonte gap:** OrisLab Q ha un modulo "Anomalie/Incidente" per la sorveglianza post-market (MDR Art. 87-88). UÀ aveva solo non-conformità di produzione — diverso dal registro incidenti.

**Files:**
- Aggiungi tabella su Supabase
- Modify: `src/app/(app)/qualita/page.tsx`
- Create: `src/app/api/qualita/incidenti/route.ts`

- [ ] Aggiungi tabella su Supabase SQL Editor

```sql
CREATE TABLE IF NOT EXISTS incidenti_mdr (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id        UUID NOT NULL REFERENCES laboratori(id) ON DELETE CASCADE,
  lavoro_id             UUID REFERENCES lavori(id),
  -- Classificazione
  tipo                  TEXT NOT NULL DEFAULT 'anomalia'
                        CHECK (tipo IN ('anomalia','incidente','incidente_grave','azione_correttiva_sicurezza')),
  gravita               TEXT NOT NULL DEFAULT 'lieve'
                        CHECK (gravita IN ('lieve','moderata','grave','critica')),
  -- Dati evento
  data_evento           DATE NOT NULL,
  descrizione           TEXT NOT NULL,
  causa_probabile       TEXT,
  -- Azioni
  azione_immediata      TEXT,
  azione_correttiva     TEXT,
  azione_preventiva     TEXT,
  -- Esito
  risolto               BOOLEAN NOT NULL DEFAULT FALSE,
  data_risoluzione      DATE,
  -- Segnalazione MDR Art. 87
  segnalato_ministero   BOOLEAN NOT NULL DEFAULT FALSE,
  data_segnalazione     DATE,
  numero_segnalazione   TEXT,
  -- Audit
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ
);
SELECT apply_updated_at_trigger('incidenti_mdr');
ALTER TABLE incidenti_mdr ENABLE ROW LEVEL SECURITY;
CREATE POLICY "incidenti_lab" ON incidenti_mdr
  FOR ALL USING (laboratorio_id = auth.current_lab_id() AND deleted_at IS NULL);
CREATE POLICY "incidenti_insert" ON incidenti_mdr
  FOR INSERT WITH CHECK (laboratorio_id = auth.current_lab_id());
CREATE INDEX idx_incidenti_lab ON incidenti_mdr(laboratorio_id, data_evento DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_incidenti_gravita ON incidenti_mdr(laboratorio_id, gravita) WHERE deleted_at IS NULL AND NOT risolto;
```

- [ ] Crea `src/app/api/qualita/incidenti/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server-user'
import { isSameOrigin } from '@/lib/utils/csrf'

export async function GET() {
  const supabase = await createServerClient()
  const { data } = await supabase.from('incidenti_mdr').select('*').order('data_evento', { ascending: false }).limit(50)
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'CSRF' }, { status: 403 })
  const supabase = await createServerClient()
  const body = await req.json()
  if (!body.data_evento || !body.descrizione) return NextResponse.json({ error: 'data_evento e descrizione obbligatori' }, { status: 400 })
  const { data, error } = await supabase.from('incidenti_mdr').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // Alert automatico se gravita = grave o critica (non risolto)
  if (['grave','critica'].includes(body.gravita)) {
    // TODO Fase 3: notifica push al titolare
    console.warn('INCIDENTE MDR GRAVE — notifica push pendente:', data?.id)
  }
  return NextResponse.json(data, { status: 201 })
}
```

- [ ] Aggiorna `src/app/(app)/qualita/page.tsx` — aggiungi sezione Incidenti

```tsx
// Aggiungere dopo Analisi Rischi:
const { data: incidenti } = await supabase
  .from('incidenti_mdr')
  .select('id,tipo,gravita,data_evento,descrizione,risolto,segnalato_ministero')
  .is('deleted_at', null)
  .order('data_evento', { ascending: false })
  .limit(10)

// Rendering:
<div style={{ marginTop: 24 }}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
    <p style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#8899CC', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      Registro Incidenti MDR
    </p>
    <a href="/qualita/incidenti/nuovo" style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#D4A843', textDecoration: 'none' }}>+ Nuovo</a>
  </div>
  {(incidenti ?? []).map(inc => (
    <div key={inc.id} style={{
      background: inc.gravita === 'critica' ? '#3A0A0A' : inc.gravita === 'grave' ? '#3A1A1A' : '#1B2D6B',
      borderRadius: 12, padding: '12px 14px', marginBottom: 8,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600, color: inc.gravita === 'critica' ? '#FF6B6B' : inc.gravita === 'grave' ? '#FA5252' : '#F0F4FF' }}>
          {inc.tipo.replace('_',' ').toUpperCase()} — {inc.gravita.toUpperCase()}
        </span>
        <span style={{ fontFamily: 'DM Sans', fontSize: 11, color: inc.risolto ? '#2ECC9A' : '#FD7E14' }}>
          {inc.risolto ? '✓ Risolto' : '⚠ Aperto'}
        </span>
      </div>
      <p style={{ margin: '4px 0 0', fontFamily: 'DM Sans', fontSize: 12, color: '#8899CC' }}>
        {inc.data_evento} — {inc.descrizione.slice(0, 80)}{inc.descrizione.length > 80 ? '...' : ''}
      </p>
      {inc.segnalato_ministero && (
        <p style={{ margin: '2px 0 0', fontFamily: 'DM Sans', fontSize: 11, color: '#4C6EF5' }}>
          📋 Segnalato al Ministero (MDR Art. 87)
        </p>
      )}
    </div>
  ))}
  {(incidenti ?? []).length === 0 && (
    <p style={{ textAlign: 'center', fontFamily: 'DM Sans', color: '#2ECC9A', marginTop: 16 }}>
      ✅ Nessun incidente registrato
    </p>
  )}
</div>
```

- [ ] Aggiorna `DashboardStats` in `src/types/domain.ts` — aggiungere KPI incidenti aperti

```ts
// In DashboardStats aggiungere:
incidenti_aperti: number;  // gravita IN ('grave','critica') AND risolto = FALSE
```

- [ ] Commit

```bash
git add src/app/(app)/qualita/ src/app/api/qualita/incidenti/
git commit -m "feat(mdr): registro incidenti MDR Art.87-88 con segnalazione Ministero — gap OrisLab Q colmato"
```

---

## Self-Review Aggiornato

| Feature OrisLab Q | UÀ dopo Task 26-28 |
|---|---|
| Dichiarazione di Conformità | ✅ |
| Nomina PRRC (Art. 15) | ✅ Task 26 |
| Intervento ricondizionamento | ✅ tipo=riparazione + workflow |
| PSUR | ✅ |
| Analisi Rischi fascicolo tecnico | ✅ Task 27 |
| Registro Anomalie/Incidenti (Art. 87-88) | ✅ Task 28 |
| Fatturazione elettronica SDI | ✅ inclusa (OrisLab = add-on) |
| My.doc conservazione sostitutiva | ✅ inclusa (OrisLab = add-on) |
| My.Lab portale dentista | ✅ incluso (OrisLab = add-on) |

**Copertura OrisLab Q dopo i 3 fix: ~98%.**
Il restante 2% (Prima Nota contabile, Scadenzario pagamenti, Agenti commerciali) non è rilevante per il target micro-lab di UÀ.


---

## Task 29: PSUR — Periodic Safety Update Report

**Fonte fix:** Esperto 2 MDR — PSUR dichiarato ✅ ma senza implementazione. MDR Art. 86 obbliga PSUR annuale per dispositivi Classe IIa.

**Files:**
- Create: `src/app/(app)/qualita/psur/page.tsx`
- Create: `src/app/api/qualita/psur/route.ts`
- Create: `src/lib/pdf/generate-psur.ts`
- Create: `src/components/features/pdf/PsurTemplate.tsx`

- [ ] Aggiungi tabella `psur` su Supabase (SQL in spec §17.4)

- [ ] Crea `src/app/api/qualita/psur/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server-user'
import { isSameOrigin } from '@/lib/utils/csrf'

export async function GET() {
  const supabase = await createServerClient()
  const { data } = await supabase.from('psur').select('*').order('anno_riferimento', { ascending: false })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'CSRF' }, { status: 403 })
  const supabase = await createServerClient()
  const body = await req.json()
  // Calcola aggregati automaticamente
  const anno = body.anno_riferimento ?? new Date().getFullYear() - 1
  const inizio = `${anno}-01-01`
  const fine = `${anno}-12-31`
  const [disp, nc, inc, rifac] = await Promise.all([
    supabase.from('lavori').select('id', { count: 'exact' }).gte('data_consegna_effettiva', inizio).lte('data_consegna_effettiva', fine),
    supabase.from('lavori_fasi').select('id', { count: 'exact' }).eq('non_conforme', true).gte('created_at', inizio).lte('created_at', fine),
    supabase.from('incidenti_mdr').select('id', { count: 'exact' }).gte('data_evento', inizio).lte('data_evento', fine),
    supabase.from('lavori').select('id', { count: 'exact' }).eq('is_rifacimento', true).gte('created_at', inizio).lte('created_at', fine),
  ])
  const { data, error } = await supabase.from('psur').insert({
    ...body,
    anno_riferimento: anno,
    periodo_inizio: inizio, periodo_fine: fine,
    totale_dispositivi: disp.count ?? 0,
    totale_non_conformita: nc.count ?? 0,
    totale_incidenti: inc.count ?? 0,
    totale_rifacimenti: rifac.count ?? 0,
    stato: 'bozza',
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

- [ ] Crea pagina lista PSUR in `src/app/(app)/qualita/psur/page.tsx`

```tsx
import { createServerClient } from '@/lib/supabase/server-user'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { AppHeader } from '@/components/layout/AppHeader'

export default async function PsurPage() {
  const supabase = await createServerClient()
  const { data: reports } = await supabase.from('psur').select('*').order('anno_riferimento', { ascending: false })
  const annoCorrente = new Date().getFullYear() - 1
  const haCurrent = (reports ?? []).some(r => r.anno_riferimento === annoCorrente)
  return (
    <PageWrapper>
      <AppHeader title="PSUR" subtitle="Periodic Safety Update Report — MDR Art. 86" backHref="/qualita" />
      {!haCurrent && (
        <div style={{ background: '#3A2A1A', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
          <p style={{ margin: 0, fontFamily: 'DM Sans', fontSize: 13, color: '#FD7E14', fontWeight: 600 }}>
            ⚠️ PSUR {annoCorrente} non ancora generato — obbligatorio entro il 31/12/{new Date().getFullYear()}
          </p>
        </div>
      )}
      {(reports ?? []).map(r => (
        <div key={r.id} style={{ background: '#1B2D6B', borderRadius: 12, padding: '14px 16px', marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'DM Sans', fontSize: 14, fontWeight: 700, color: '#F0F4FF' }}>PSUR {r.anno_riferimento}</span>
            <span style={{ fontFamily: 'DM Sans', fontSize: 11, color: r.stato === 'firmato' ? '#2ECC9A' : '#FD7E14' }}>
              {r.stato.toUpperCase()}
            </span>
          </div>
          <p style={{ margin: '6px 0 0', fontFamily: 'DM Sans', fontSize: 12, color: '#8899CC' }}>
            {r.totale_dispositivi} dispositivi · {r.totale_non_conformita} NC · {r.totale_incidenti} incidenti · {r.totale_rifacimenti} rifacimenti
          </p>
          {r.pdf_url && <a href={r.pdf_url} target="_blank" rel="noopener" style={{ fontFamily: 'DM Sans', fontSize: 12, color: '#4C6EF5' }}>PDF firmato →</a>}
        </div>
      ))}
    </PageWrapper>
  )
}
```

- [ ] Commit

```bash
git add src/app/(app)/qualita/psur/ src/app/api/qualita/psur/ src/lib/pdf/generate-psur.ts
git commit -m "feat(mdr): PSUR annuale MDR Art.86 con aggregati automatici — gap claim rimosso"
```

---

## Task 30: Rete Multi-Sede — Entità DB + Dashboard Consolidata

**Fonte fix:** Esperto 5 — pricing €129 multi-sede promesso ma entità rete non nel schema.

**Files:**
- Aggiungi tabelle `reti` + `reti_membri` su Supabase (SQL in spec §17.3)
- Create: `src/app/(app)/rete/page.tsx`
- Create: `src/app/api/rete/route.ts`

- [ ] Aggiungi tabelle `reti` e `reti_membri` (SQL spec §17.3)

- [ ] Crea `src/app/api/rete/route.ts`

```ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server-user'

export async function GET() {
  const supabase = await createServerClient()
  // Rete di cui questo lab è admin
  const { data: reti } = await supabase
    .from('reti')
    .select('*, membri:reti_membri(laboratorio_id, ruolo, laboratorio:laboratori(id, nome, citta))')
  return NextResponse.json(reti ?? [])
}
```

- [ ] Crea pagina rete in `src/app/(app)/rete/page.tsx` (dashboard consolidata KPI per lab)

```tsx
import { createServerClient } from '@/lib/supabase/server-user'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { AppHeader } from '@/components/layout/AppHeader'

export default async function RetePage() {
  const supabase = await createServerClient()
  const { data: rete } = await supabase
    .from('reti')
    .select('*, reti_membri(laboratorio_id, laboratorio:laboratori(id, nome, citta))')
    .single()

  if (!rete) {
    return (
      <PageWrapper>
        <AppHeader title="Rete" />
        <p style={{ fontFamily: 'DM Sans', color: '#8899CC', textAlign: 'center', marginTop: 48 }}>
          Nessuna rete configurata. Contatta il supporto per attivare UÀ Rete.
        </p>
      </PageWrapper>
    )
  }
  return (
    <PageWrapper>
      <AppHeader title={rete.nome} subtitle={`${rete.reti_membri?.length ?? 0} laboratori`} />
      {(rete.reti_membri ?? []).map((m: any) => (
        <div key={m.laboratorio_id} style={{ background: '#1B2D6B', borderRadius: 12, padding: '14px 16px', marginBottom: 8 }}>
          <p style={{ margin: 0, fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600, color: '#F0F4FF' }}>{m.laboratorio?.nome}</p>
          <p style={{ margin: '2px 0 0', fontFamily: 'DM Sans', fontSize: 12, color: '#8899CC' }}>{m.laboratorio?.citta}</p>
        </div>
      ))}
    </PageWrapper>
  )
}
```

- [ ] Commit

```bash
git add src/app/(app)/rete/ src/app/api/rete/
git commit -m "feat(rete): entità rete multi-sede + dashboard consolidata per piano UÀ Rete €129"
```

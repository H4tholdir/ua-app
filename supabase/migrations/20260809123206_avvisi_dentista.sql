-- ═══════════════════════════════════════════════════════════════════════════
-- avvisi_dentista — il promemoria che non si spegne da solo, e la prova
-- che il dentista è stato avvisato della rettifica.
--
-- Ondata «l'avviso al dentista», Task 1.
-- Base: GDPR Art. 19 (comunicazione della rettifica ai destinatari) +
-- Art. 5(2) (l'onere della prova è del titolare) · D317, D331-D339.
--
-- 🛑 QUESTA MIGRATION SI SCOSTA DALLA SQL DEL PIANO IN QUATTRO PUNTI, tutti
--    misurati contro il catalogo vivo prima di scrivere. Ogni scostamento
--    porta il suo perché qui sotto, accanto alla riga che lo applica.
--    Prove: tests/integration/avvisi-dentista-schema.rpc.test.ts
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.avvisi_dentista (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id        uuid NOT NULL REFERENCES public.laboratori(id) ON DELETE CASCADE,
  lavoro_id             uuid NOT NULL REFERENCES public.lavori(id) ON DELETE CASCADE,

  -- ⚠️ SCOSTAMENTO 1 — il piano scriveva `ON DELETE RESTRICT` su queste due.
  -- `admin_delete_laboratorio` cancella le tabelle A MANO, e `avvisi_dentista`
  -- non è nel suo elenco: cancella `dichiarazioni_conformita` e `clienti`
  -- PRIMA di arrivare al laboratorio, quindi con RESTRICT la cancellazione di
  -- un laboratorio che ha un solo avviso moriva con 23503. È la quarta volta
  -- in questa famiglia (cassette, denti, eventi — D274 ①). Con CASCADE la
  -- funzione sopravvive senza essere toccata, e RESTRICT non comprava niente:
  -- la riga muore comunque col lavoro, che è già CASCADE.
  cliente_id            uuid NOT NULL REFERENCES public.clienti(id) ON DELETE CASCADE,
  dichiarazione_id      uuid NOT NULL REFERENCES public.dichiarazioni_conformita(id) ON DELETE CASCADE,

  stato                 text NOT NULL DEFAULT 'da_comunicare',
  campi_corretti        text[] NOT NULL DEFAULT '{}',
  testo_inviato         text,
  comunicato_at         timestamptz,

  -- ⚠️ SCOSTAMENTO 2 — il piano puntava a `auth.users(id)`. È una presunzione,
  -- e il catalogo la smentisce: 17 colonne «chi ha fatto l'azione» su 18
  -- puntano a `public.utenti(id)` (l'unica eccezione, `inviti.created_by`, è
  -- una tabella PRE-account, dove l'utente non esiste ancora). Le sorelle più
  -- vicine — `dichiarazioni_conformita.generated_by` e
  -- `valutazioni_evento.classificato_da` — puntano a `utenti`.
  -- 🔑 E il motivo PORTANTE non è la coerenza: D335 chiede di registrare CHI,
  -- e la scheda del dentista deve mostrarne il nome. Lo schema `auth` NON è
  -- esposto da PostgREST, quindi una FK verso `auth.users` rende impossibile
  -- incorporare l'autore in una lettura — la colonna sarebbe un uuid e nulla
  -- più. `public.utenti.id` è la stessa chiave (FK verso auth.users, 7 righe
  -- su 7 coincidenti), ma leggibile e più stretta.
  -- 🛑 E NON `ON DELETE SET NULL`, benché due sorelle lo usino: l'azione
  -- referenziale è un UPDATE, che rivaluta
  -- `avviso_comunicato_ha_autore_e_data` — il quale PRETENDE l'autore quando
  -- lo stato è chiuso. Con SET NULL la cancellazione di un utente morirebbe
  -- con un 23514 incomprensibile invece del 23503 giusto. NO ACTION (implicito)
  -- è anche la scelta di `dichiarazioni_conformita.generated_by`, che è la
  -- sorella con lo stesso ruolo: autore di un documento a valore di prova.
  comunicato_da         uuid REFERENCES public.utenti(id),

  visto_dal_dentista_at timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT avviso_stato_vocabolario
    CHECK (stato IN ('da_comunicare','comunicato_dall_app','comunicato_a_voce')),

  -- Un avviso chiuso porta SEMPRE chi e quando (D335). Un avviso aperto non
  -- può portarli: sarebbe una chiusura a metà, invisibile in ogni elenco.
  CONSTRAINT avviso_comunicato_ha_autore_e_data
    CHECK (
      (stato = 'da_comunicare' AND comunicato_at IS NULL AND comunicato_da IS NULL)
      OR (stato <> 'da_comunicare' AND comunicato_at IS NOT NULL AND comunicato_da IS NOT NULL)
    ),

  -- ⚠️ SCOSTAMENTO 3 — il piano scriveva
  --     CHECK (stato <> 'comunicato_dall_app' OR testo_inviato IS NOT NULL)
  -- che IMPONE il testo sull'invio dall'app ma non lo VIETA altrove — mentre
  -- il suo nome («testo solo se dall'app») promette il divieto, e ⚖️ D339 lo
  -- richiede: si registra solo il testo MANDATO, la bozza proposta non si
  -- conserva. Con la formulazione del piano un `comunicato_a_voce` con dentro
  -- un testo passava, e passava anche una bozza salvata su `da_comunicare`:
  -- cioè esattamente ciò che D339 vieta, permesso dalla tabella che dovrebbe
  -- impedirlo. Stretto invece di rinominato, perché è il divieto che serve.
  CONSTRAINT avviso_testo_solo_se_dall_app
    CHECK (
      (stato =  'comunicato_dall_app' AND testo_inviato IS NOT NULL)
      OR (stato <> 'comunicato_dall_app' AND testo_inviato IS NULL)
    )
);

-- Il promemoria del laboratorio: indice PARZIALE, perché la lettura più
-- frequente riguarda solo le righe ancora aperte.
CREATE INDEX IF NOT EXISTS idx_avvisi_da_comunicare
  ON public.avvisi_dentista (laboratorio_id, created_at DESC)
  WHERE stato = 'da_comunicare';

-- L'archivio nella scheda del dentista: tutte le righe di quel cliente.
CREATE INDEX IF NOT EXISTS idx_avvisi_per_cliente
  ON public.avvisi_dentista (cliente_id, created_at DESC);

ALTER TABLE public.avvisi_dentista ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS avvisi_lettura_lab ON public.avvisi_dentista;
CREATE POLICY avvisi_lettura_lab ON public.avvisi_dentista
  FOR SELECT USING (laboratorio_id = public.current_lab_id());

DROP POLICY IF EXISTS avvisi_scrittura_lab ON public.avvisi_dentista;
CREATE POLICY avvisi_scrittura_lab ON public.avvisi_dentista
  FOR UPDATE USING (laboratorio_id = public.current_lab_id())
              WITH CHECK (laboratorio_id = public.current_lab_id());

-- ⚠️ SCOSTAMENTO 4 — LE DUE RIGHE CHE IL PIANO NON AVEVA, E SONO PORTANTI.
-- Il piano affidava a «nessuna politica di INSERT» la garanzia che nessun
-- chiamante applicativo possa creare un avviso. Due fatti misurati la
-- smontano:
--   ① `service_role` ha `rolbypassrls = true`. La RLS non lo tocca AFFATTO,
--      ed è il ruolo che il server usa davvero: senza il REVOKE, un INSERT
--      diretto dall'applicazione riusciva.
--   ② i privilegi di default di questo progetto concedono `arwdDxtm` — ALL,
--      **TRUNCATE compreso** — a anon/authenticated/service_role su OGNI
--      tabella nuova di `public` (`pg_default_acl`). E **TRUNCATE ignora la
--      RLS**: chiunque poteva svuotare gli avvisi di TUTTI i laboratori
--      insieme. È lo stesso difetto già pagato su `valutazioni_evento`
--      (D274 ②, migration 20260806170700).
-- La forma corretta è già in casa: `REVOKE ALL` (che chiude anche TRUNCATE,
-- REFERENCES e TRIGGER) più il `GRANT` esplicito di ciò che serve davvero.
-- ⚠️ Il GRANT sotto è esattamente `SELECT, UPDATE`: l'INSERT NON torna — nasce
-- solo dentro `correggi_e_riemetti_atomica`, che è SECURITY DEFINER e scrive
-- come proprietario, quindi non ha bisogno del permesso qui.
REVOKE ALL ON public.avvisi_dentista FROM anon, authenticated, service_role;
GRANT SELECT, UPDATE ON public.avvisi_dentista TO anon, authenticated, service_role;

COMMENT ON TABLE public.avvisi_dentista IS
  'GDPR Art. 19 + Art. 5(2): la comunicazione della rettifica al destinatario, '
  'e la prova che e'' avvenuta. Nasce dentro la transazione della riemissione '
  '(D317, D331-D339). Nessuno stato «annullato»: un avviso nasce da un fatto. '
  'INSERT revocato a tutti i ruoli dell''app: l''unica via e'' la RPC '
  'SECURITY DEFINER. La RLS da sola non basterebbe — service_role la aggira.';

COMMENT ON COLUMN public.avvisi_dentista.comunicato_da IS
  'Chi ha avvisato il dentista (D335). Punta a public.utenti, NON a '
  'auth.users: lo schema auth non e'' esposto da PostgREST e il nome '
  'dell''autore non sarebbe leggibile.';

COMMENT ON COLUMN public.avvisi_dentista.testo_inviato IS
  'Solo il testo MANDATO davvero, e solo per l''invio dall''app (D339). La '
  'bozza proposta non si conserva: il CHECK la rifiuta su ogni altro stato.';

COMMENT ON COLUMN public.avvisi_dentista.visto_dal_dentista_at IS
  'Quando il dentista ha aperto l''avviso nel portale (D332). Non chiude il '
  'promemoria: chiuderlo e'' un atto del laboratorio, non del destinatario.';

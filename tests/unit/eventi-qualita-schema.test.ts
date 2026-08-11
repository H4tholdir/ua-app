import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Contratto statico delle due tabelle dell'ondata «si deve sempre poter
// intervenire» (Task 1): eventi_qualita (il FATTO) e valutazioni_evento (il
// GIUDIZIO, sola-aggiunta).
//
// PERCHÉ QUESTO FILE ESISTE — §0① dell'handoff 2026-08-06: il Task 1 ha creato
// due tabelle, tre chiavi esterne composite, quattro CHECK e una funzione
// SECURITY DEFINER, e le nove verifiche di rifiuto sono state eseguite A MANO.
// Vivevano in un rapporto fuori da git: chi toccava la migration non trovava
// nessun controllo acceso.
//
// DUE STRATI, come già fatto per emetti_nota_credito_atomica:
//  · questo file  — legge le migration e blocca il patto (firma, vincoli,
//    permessi). Gira SEMPRE, anche in CI, senza credenziali di database.
//  · tests/integration/eventi-qualita-schema.rpc.test.ts — prova il
//    COMPORTAMENTO contro il database vero (rifiuti reali), in transazione
//    annullata; si salta da solo senza SUPABASE_DB_URL.
// Nessuno dei due sostituisce l'altro: qui si prova che il testo è quello
// giusto, là che il database si comporta come il testo promette.
//
// ⚠️ QUALE MIGRATION È AUTOREVOLE, E PERCHÉ CONTA
// Lo stato deployato nasce da DUE file. Il primo (20260806140823) contiene un
// `REVOKE UPDATE, DELETE ... FROM anon, authenticated;` INCOMPLETO: senza
// service_role, che ha bypassrls ed è il ruolo che l'applicazione usa davvero
// (nota E8). Il secondo (20260806142910) lo corregge e aggiunge le FK
// composite. Le asserzioni su permessi e chiavi esterne leggono quindi il
// SECONDO file: se le leggessero dal primo, cancellare la correzione lascerebbe
// questo test verde — cioè coprirebbe esattamente il difetto che chiude.

const DIR = join(__dirname, '..', '..', 'supabase', 'migrations')
// Le tabelle, i vocabolari e l'indice parziale: nascono qui.
const sqlTabelle = readFileSync(join(DIR, '20260806140823_eventi_qualita.sql'), 'utf8')
// AUTOREVOLE per permessi e chiavi esterne (vedi nota sopra).
const sqlCorrezione = readFileSync(join(DIR, '20260806142910_correzione_eventi_qualita_cross_tenant.sql'), 'utf8')

describe('eventi_qualita — il fatto', () => {
  it('nasce con le sette colonne obbligatorie della spec §4', () => {
    for (const colonna of [
      'laboratorio_id', 'lavoro_id', 'motivo', 'natura',
      'origine_informazione', 'conosciuto_il', 'stato_dispositivo',
    ]) {
      expect(sqlTabelle).toMatch(new RegExp(`${colonna}\\s+[A-Z]+[^,]*NOT NULL`))
    }
  })

  it('vocabolario dei motivi: nove voci, quelle della spec e non altre', () => {
    const motivi = sqlTabelle.match(/motivo\s+TEXT NOT NULL CHECK \(motivo IN \(([\s\S]*?)\)\)/)
    expect(motivi).not.toBeNull()
    const voci = [...motivi![1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1])
    expect(voci).toEqual([
      'errore_dato_dichiarazione', 'difetto_lavorazione', 'difetto_materiale',
      'destinatario_errato', 'modifica_clinica_richiesta', 'errore_prezzo_quantita',
      'reso_senza_difetto', 'errore_registrazione', 'altro',
    ])
  })

  it('stato_dispositivo distingue «consegnato ma non applicato» — il confine ribaltato (D269)', () => {
    const stati = sqlTabelle.match(/stato_dispositivo\s+TEXT NOT NULL CHECK \(stato_dispositivo IN \(([\s\S]*?)\)\)/)
    expect(stati).not.toBeNull()
    const voci = [...stati![1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1])
    expect(voci).toEqual(['mai_uscito_dal_lab', 'consegnato_non_applicato', 'applicato', 'non_noto'])
  })

  it('«altro» senza testo libero è rifiutato dal database, non dal form', () => {
    expect(sqlTabelle).toMatch(
      /CONSTRAINT evento_altro_ha_testo CHECK \(motivo <> 'altro' OR \(motivo_libero IS NOT NULL AND length\(btrim\(motivo_libero\)\) > 0\)\)/
    )
  })

  it('non tocca lo stato del lavoro: nessun UPDATE su public.lavori nella migration (D266)', () => {
    expect(sqlTabelle).not.toMatch(/UPDATE\s+public\.lavori/i)
  })
})

describe('valutazioni_evento — il giudizio, sola-aggiunta', () => {
  it('«nessuna azione» senza giustificazione è rifiutato (spec §8.2.2)', () => {
    expect(sqlTabelle).toMatch(
      /CONSTRAINT valutazione_nessuna_azione_giustificata\s*\n?\s*CHECK \(esito <> 'nessuna_azione' OR \(giustificazione IS NOT NULL AND length\(btrim\(giustificazione\)\) > 0\)\)/
    )
  })

  it('riclassificare senza dire perché è rifiutato', () => {
    expect(sqlTabelle).toMatch(
      /CONSTRAINT valutazione_riclassifica_motivata\s*\n?\s*CHECK \(sostituisce_id IS NULL OR \(motivo_riclassificazione IS NOT NULL AND length\(btrim\(motivo_riclassificazione\)\) > 0\)\)/
    )
  })

  it('una valutazione non può superare sé stessa', () => {
    expect(sqlTabelle).toMatch(/CONSTRAINT valutazione_no_self_ref CHECK \(id <> sostituisce_id\)/)
  })

  it('una sola valutazione VIVA per evento: indice unico PARZIALE su superata = false', () => {
    expect(sqlTabelle).toMatch(
      /CREATE UNIQUE INDEX IF NOT EXISTS valutazione_viva_unique\s*\n?\s*ON public\.valutazioni_evento \(laboratorio_id, evento_id\) WHERE \(superata = false\)/
    )
  })

  it('gli esiti sono i cinque dell\'ordine ministeriale, incidente_grave compreso', () => {
    const esiti = sqlTabelle.match(/esito\s+TEXT NOT NULL CHECK \(esito IN \(([\s\S]*?)\)\)/)
    expect(esiti).not.toBeNull()
    const voci = [...esiti![1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1])
    expect(voci).toEqual([
      'nessuna_azione', 'non_conformita_interna', 'reclamo', 'incidente', 'incidente_grave',
    ])
  })

  it('le policy RLS concedono SELECT e INSERT e nient\'altro — nessun FOR ALL (D270)', () => {
    expect(sqlTabelle).toMatch(/CREATE POLICY "valutazioni_evento_lab_select" ON public\.valutazioni_evento\s*\n?\s*FOR SELECT/)
    expect(sqlTabelle).toMatch(/CREATE POLICY "valutazioni_evento_lab_insert" ON public\.valutazioni_evento\s*\n?\s*FOR INSERT/)
    // Un FOR ALL su questa tabella riaprirebbe UPDATE e DELETE dalla porta di servizio.
    expect(sqlTabelle).not.toMatch(/CREATE POLICY [^\n]*ON public\.valutazioni_evento\s*\n?\s*FOR ALL/)
  })
})

describe('la sola-aggiunta la garantisce il DATABASE, non il codice (D270 + nota E8)', () => {
  it('🔴 il REVOKE include service_role — il ruolo che l\'applicazione usa davvero', () => {
    // Il valore che DEVE fallire, se qualcuno tornasse alla forma del primo file:
    // `FROM anon, authenticated;` senza service_role. service_role ha bypassrls,
    // quindi la RLS non lo ferma e il REVOKE è l'unica difesa.
    expect(sqlCorrezione).toMatch(
      /REVOKE UPDATE, DELETE ON public\.valutazioni_evento FROM anon, authenticated, service_role;/
    )
  })

  it('esiste una sola via per marcare «superata»: valutazione_supera, SECURITY DEFINER col search_path bloccato', () => {
    expect(sqlCorrezione).toMatch(
      /CREATE OR REPLACE FUNCTION public\.valutazione_supera\(\s*p_valutazione_vecchia_id uuid, p_laboratorio_id uuid\s*\) RETURNS json/
    )
    expect(sqlCorrezione).toMatch(/LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp/)
  })

  it('la funzione è chiudibile solo da service_role: REVOKE a tutti, GRANT a uno', () => {
    expect(sqlCorrezione).toMatch(
      /REVOKE ALL ON FUNCTION public\.valutazione_supera\(uuid, uuid\) FROM PUBLIC, anon, authenticated;/
    )
    expect(sqlCorrezione).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.valutazione_supera\(uuid, uuid\) TO service_role;/
    )
  })

  it('la funzione scrive solo sulla riga del laboratorio chiamante', () => {
    expect(sqlCorrezione).toMatch(
      /UPDATE public\.valutazioni_evento\s*\n\s*SET superata = true\s*\n\s*WHERE id = p_valutazione_vecchia_id\s*\n\s*AND laboratorio_id = p_laboratorio_id/
    )
  })
})

describe('i riferimenti fra tenant sono COMPOSITI — il secondo Critico del Task 1', () => {
  it('eventi_qualita porta la UNIQUE (id, laboratorio_id) che le FK composite richiedono', () => {
    expect(sqlCorrezione).toMatch(
      /ALTER TABLE public\.eventi_qualita\s*\n\s*ADD CONSTRAINT eventi_qualita_id_lab_uk UNIQUE \(id, laboratorio_id\);/
    )
  })

  it('🔴 le tre chiavi esterne fra tenant sono composite, non semplici', () => {
    // eventi_qualita → lavori: con una FK semplice il laboratorio A poteva
    // creare un evento sul lavoro del laboratorio B (la RLS controlla solo la
    // riga che si inserisce, non chi possiede la riga puntata).
    expect(sqlCorrezione).toMatch(
      /ADD CONSTRAINT eventi_qualita_lavoro_fk FOREIGN KEY \(lavoro_id, laboratorio_id\)\s*\n\s*REFERENCES public\.lavori \(id, laboratorio_id\)/
    )
    expect(sqlCorrezione).toMatch(
      /ADD CONSTRAINT valutazioni_evento_evento_fk FOREIGN KEY \(evento_id, laboratorio_id\)\s*\n\s*REFERENCES public\.eventi_qualita \(id, laboratorio_id\)/
    )
    expect(sqlCorrezione).toMatch(
      /ADD CONSTRAINT lavori_rifacimenti_evento_fk FOREIGN KEY \(evento_id, laboratorio_id\)\s*\n\s*REFERENCES public\.eventi_qualita \(id, laboratorio_id\)/
    )
  })

  it('nessuna delle tre resta semplice: le vecchie FK sono state rimosse', () => {
    for (const vecchia of [
      'eventi_qualita_lavoro_id_fkey',
      'valutazioni_evento_evento_id_fkey',
      'lavori_rifacimenti_evento_id_fkey',
    ]) {
      expect(sqlCorrezione).toMatch(new RegExp(`DROP CONSTRAINT ${vecchia},`))
    }
  })
})

describe('D271 — la certificazione ISO 13485 è un dato, con tre stati', () => {
  it('il default si comporta come «non dichiarato», e i valori ammessi sono tre', () => {
    expect(sqlTabelle).toMatch(
      /ADD COLUMN IF NOT EXISTS certificazione_iso13485 TEXT NOT NULL DEFAULT 'non_dichiarato'\s*\n\s*CHECK \(certificazione_iso13485 IN \('certificato','non_certificato','non_dichiarato'\)\)/
    )
  })
})

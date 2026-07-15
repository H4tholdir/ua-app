import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Contratto della RPC public.emetti_nota_credito_atomica per Task 3
// (Nota di Credito TD04). Non esiste ancora una route che la chiama (Task
// 6): un mock di `.rpc('emetti_nota_credito_atomica', ...)` senza un
// chiamante reale sarebbe circolare (asserirebbe solo lo stub stesso).
// Il comportamento reale (gate, claim-first, snapshot, reset fiscale) è
// verificato con la RPC vera in
// tests/integration/emetti-nota-credito-atomica.rpc.test.ts (richiede
// SUPABASE_DB_URL). Questo test documenta e blocca il contratto statico —
// firma, esiti ammessi, sicurezza — leggendo la migration.

const MIGRATION_PATH = join(
  __dirname, '..', '..', 'supabase', 'migrations', '20260715100000_emetti_nota_credito_rpc.sql'
)
const sql = readFileSync(MIGRATION_PATH, 'utf8')

describe('emetti_nota_credito_atomica — contratto (migration statica)', () => {
  it('firma: p_originale_id uuid, p_causale text, p_laboratorio_id uuid → json', () => {
    expect(sql).toMatch(
      /CREATE OR REPLACE FUNCTION public\.emetti_nota_credito_atomica\(\s*p_originale_id uuid, p_causale text, p_laboratorio_id uuid\s*\) RETURNS json/
    )
  })

  it('sicurezza: SECURITY DEFINER search_path bloccato + privilegi limitati a service_role', () => {
    expect(sql).toMatch(/SECURITY DEFINER SET search_path = public, pg_temp/)
    expect(sql).toMatch(
      /REVOKE ALL ON FUNCTION public\.emetti_nota_credito_atomica\(uuid, text, uuid\) FROM PUBLIC, anon, authenticated;/
    )
    expect(sql).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.emetti_nota_credito_atomica\(uuid, text, uuid\) TO service_role;/
    )
  })

  it('esiti ammessi: ok, non_stornabile, non_trovato (nessun altro esito)', () => {
    const esiti = [...sql.matchAll(/esito', ?'([a-z_]+)'/g)].map((m) => m[1])
    expect(new Set(esiti)).toEqual(new Set(['non_trovato', 'non_stornabile', 'ok']))
  })

  it('gate claim-first: stornata_at IS NULL prima di ogni altra condizione, come prima istruzione', () => {
    const claimIdx = sql.indexOf('UPDATE public.fatture SET stornata_at = now()')
    const insertIdx = sql.indexOf('INSERT INTO public.fatture')
    const resetLavoroIdx = sql.indexOf("SET incluso_in_fattura = false")
    expect(claimIdx).toBeGreaterThan(-1)
    expect(claimIdx).toBeLessThan(insertIdx)
    expect(claimIdx).toBeLessThan(resetLavoroIdx)
    expect(sql).toMatch(
      /WHERE id = p_originale_id AND laboratorio_id = p_laboratorio_id\s*\n\s*AND stornata_at IS NULL AND tipo_documento = 'TD01'\s*\n\s*AND stato_sdi IN \('smtp_inviata','pec_consegnata','ricevuta_sdi','accettata','scaduta'\)/
    )
  })

  it('reset lavoro SOLO fiscale: la SET clause tocca solo incluso_in_fattura/decisione_fatturazione', () => {
    const blocco4 = sql.slice(sql.indexOf('-- 4. Reset lavoro'), sql.indexOf('RETURN json_build_object(\'esito\', \'ok\''))
    // Isola solo la SET clause dell'UPDATE lavori (esclude il commento MDR
    // sopra, che cita quelle colonne apposta per documentare cosa NON va toccato).
    const setClause = blocco4.match(/UPDATE public\.lavori\s*\n\s*SET ([^\n]+)/)?.[1] ?? ''
    expect(setClause).toBe("incluso_in_fattura = false, decisione_fatturazione = 'in_attesa'")
    expect(setClause).not.toMatch(/\bstato\s*=/)
    expect(setClause).not.toMatch(/conformato/)
    expect(setClause).not.toMatch(/data_consegna_effettiva/)
    expect(setClause).not.toMatch(/dichiarazioni_conformita/)
  })

  it('ogni statement DML è filtrato su p_laboratorio_id/laboratorio_id (tenant isolation)', () => {
    const statements = sql.split(/;\s*\n/).filter((s) => /^\s*(UPDATE|INSERT INTO|SELECT \* INTO)/.test(s.trim()))
    for (const stmt of statements) {
      expect(stmt).toMatch(/laboratorio_id/)
    }
  })

  it('adjudicati: data = current_date (non l\'originale) e imponibile = v_orig.imponibile (mai dal lavoro)', () => {
    expect(sql).toMatch(/current_date, 'TD04'/)
    expect(sql).toMatch(/'draft', v_orig\.imponibile,/)
  })

  it('non genera XML (fuori RPC — Task 6)', () => {
    expect(sql).not.toMatch(/xml_fattura_pa|<FatturaElettronica/)
  })
})

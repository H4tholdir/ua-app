import type { Psur, GruppoClassePsur } from '@/types/domain'
import { getStatoSorveglianza } from '@/lib/utils/sorveglianza-postvendita'

const LABEL_GRUPPO: Record<GruppoClassePsur, string> = {
  classe_i: 'Classe I',
  classe_iia: 'Classe IIa',
  classe_iib_iii: 'Classe IIb / III',
}

const STATO_LABEL: Record<Psur['stato'], string> = {
  bozza: 'Bozza',
  completato: 'Completato',
  firmato: 'Firmato',
}

const STATO_COLOR: Record<Psur['stato'], string> = {
  bozza: 'var(--t2, #4A3D33)',
  completato: 'var(--t2, #4A3D33)',
  firmato: 'var(--success, #16A34A)',
}

const STATO_BG: Record<Psur['stato'], string> = {
  bozza: 'hsl(43 65% 55% / 0.12)',
  completato: 'hsl(220 50% 65% / 0.12)',
  firmato: 'hsl(159 63% 49% / 0.12)',
}

const fontFamily = "'DM Sans', system-ui, sans-serif"

function formatDataIT(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

export function PsurGruppoSezione({
  gruppoClasse,
  psurDelGruppo,
  annoRendiconto,
}: {
  gruppoClasse: GruppoClassePsur
  psurDelGruppo: Psur[] // già filtrato per questo gruppo, ordinato anno_riferimento DESC
  annoRendiconto: number
}) {
  const ultimoRecord = psurDelGruppo[0] ?? null
  const stato = getStatoSorveglianza(gruppoClasse, ultimoRecord?.periodo_fine ?? null)

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h2 style={{ color: 'var(--t1, #1C1916)', fontSize: '16px', fontWeight: 700, fontFamily, margin: 0 }}>
        {stato.tipoDocumento} — {LABEL_GRUPPO[gruppoClasse]}
      </h2>
      <p style={{ color: 'var(--t2, #4A3D33)', fontSize: '12px', fontFamily, margin: '-8px 0 0' }}>
        {stato.cadenzaLabel}
      </p>

      {stato.alertLivello !== 'nessuno' && (
        <div
          role="alert"
          style={{
            background: stato.alertLivello === 'urgente' ? 'rgba(253, 126, 20, 0.10)' : 'rgba(59, 130, 246, 0.08)',
            borderRadius: '12px',
            padding: '14px 16px',
            border: `1px solid ${stato.alertLivello === 'urgente' ? 'rgba(253, 126, 20, 0.4)' : 'rgba(59, 130, 246, 0.3)'}`,
          }}
        >
          <p style={{
            color: stato.alertLivello === 'urgente' ? 'var(--amber, #FD7E14)' : 'var(--c-blue, #3B82F6)',
            fontSize: '14px', fontWeight: 700, fontFamily, margin: '0 0 4px',
          }}>
            {stato.alertLivello === 'urgente'
              ? `${stato.tipoDocumento} ${annoRendiconto} mancante`
              : `${stato.tipoDocumento} — revisione consigliata`}
          </p>
          <p style={{ color: 'var(--t2, #4A3D33)', fontSize: '13px', fontFamily, margin: '0 0 12px', lineHeight: '1.5' }}>
            {stato.cadenzaLabel}. Genera il documento per l&apos;anno {annoRendiconto}.
          </p>
          <form action="/api/qualita/psur" method="POST">
            <input type="hidden" name="anno_riferimento" value={annoRendiconto} />
            <input type="hidden" name="gruppo_classe" value={gruppoClasse} />
            <button
              type="submit"
              style={{
                height: '40px', padding: '0 18px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                background: 'var(--gold, #D4A843)', color: 'var(--t1, #1C1916)', fontFamily, fontSize: '14px', fontWeight: 700,
              }}
            >
              Genera {stato.tipoDocumento} {annoRendiconto}
            </button>
          </form>
        </div>
      )}

      {psurDelGruppo.length === 0 ? (
        <div style={{ background: 'var(--surface, #E4DFD9)', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
          <p style={{ color: 'var(--t2, #4A3D33)', fontSize: '14px', fontFamily, margin: 0 }}>
            Nessun {stato.tipoDocumento} generato
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {psurDelGruppo.map((p) => (
            <div key={p.id} style={{ background: 'var(--surface, #E4DFD9)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ color: 'var(--t1, #1C1916)', fontSize: '17px', fontWeight: 700, fontFamily }}>
                  {stato.tipoDocumento} {p.anno_riferimento}
                </span>
                <span style={{
                  color: STATO_COLOR[p.stato], background: STATO_BG[p.stato], fontSize: '11px', fontWeight: 700,
                  fontFamily, padding: '3px 10px', borderRadius: '100px', textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  {STATO_LABEL[p.stato]}
                </span>
              </div>
              <p style={{ color: 'var(--t2, #4A3D33)', fontSize: '13px', fontFamily, margin: '0 0 10px' }}>
                {formatDataIT(p.periodo_inizio)} — {formatDataIT(p.periodo_fine)}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                <KpiChip label="Dispositivi" value={p.totale_dispositivi} />
                <KpiChip label="Non conformita" value={p.totale_non_conformita} alert={p.totale_non_conformita > 0} />
                <KpiChip label="Incidenti" value={p.totale_incidenti} alert={p.totale_incidenti > 0} />
                <KpiChip label="Rifacimenti" value={p.totale_rifacimenti} alert={p.totale_rifacimenti > 0} />
              </div>
              {p.prrc_nome_snapshot && (
                <p style={{ color: 'var(--t2, #4A3D33)', fontSize: '12px', fontFamily, margin: '0 0 10px' }}>
                  PRRC: {p.prrc_nome_snapshot}
                  {p.firmato_at ? ` — firmato il ${formatDataIT(p.firmato_at.slice(0, 10))}` : ''}
                </p>
              )}
              {p.pdf_url ? (
                <a href={p.pdf_url} target="_blank" rel="noreferrer" style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--c-amber, #F59E0B)',
                  fontSize: '13px', fontWeight: 600, fontFamily, textDecoration: 'none',
                }}>
                  Scarica PDF →
                </a>
              ) : (
                <span style={{ color: 'var(--t2, #4A3D33)', fontSize: '12px', fontFamily, fontStyle: 'italic' }}>
                  PDF non ancora generato
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function KpiChip({ label, value, alert = false }: { label: string; value: number; alert?: boolean }) {
  return (
    <div style={{
      background: 'var(--elv, #EDEDEA)', borderRadius: '8px', padding: '6px 10px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '70px',
    }}>
      <span style={{
        color: alert && value > 0 ? 'var(--primary, #D90012)' : 'var(--t1, #1C1916)',
        fontSize: '16px', fontWeight: 700, fontFamily,
      }}>
        {value}
      </span>
      <span style={{ color: 'var(--t2, #4A3D33)', fontSize: '10px', fontFamily, textAlign: 'center', lineHeight: '1.2' }}>
        {label}
      </span>
    </div>
  )
}

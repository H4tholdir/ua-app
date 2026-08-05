'use client'

import type { Lavoro } from '@/types/domain'
import { inputBase, labelStyle, fieldStyle, sectionSeparator, sectionTitle } from './styles'
import { OdontogrammaFDI } from '../../odontogramma/OdontogrammaFDI'
import { TavolozzaTinte } from '../TavolozzaTinte'
import { famigliaDiMacro, type TintaManufatto } from '@/lib/domain/tinta'

// ─── Scala VITA completa ────────────────────────────────────
const VITA_SCALE = [
  'A1', 'A2', 'A3', 'A3.5', 'A4',
  'B1', 'B2', 'B3', 'B4',
  'C1', 'C2', 'C3', 'C4',
  'D2', 'D3', 'D4',
  'T', 'BL', 'OM',
] as const

interface TabClinicaProps {
  data: Partial<Lavoro>
  onChange: (u: Partial<Lavoro>) => void
  /** D42 T8 — le tinte del catalogo, caricate DAL SERVER dalla pagina (la stessa
   *  `caricaTinteScheda` che serve la scheda). Assenti o vuote = nessuna
   *  tavolozza: questo componente non interroga niente. */
  tinte?: readonly TintaManufatto[]
}

export function TabClinica({ data, onChange , tinte }: TabClinicaProps) {
  return (
    <div>
      {/* ═══ ODONTOGRAMMA ══════════════════════════════════════ */}
      <div style={{ marginBottom: '24px' }}>
        <p style={sectionTitle}>Odontogramma FDI</p>
        <OdontogrammaFDI
          selezionati={(data.denti_coinvolti ?? []).map(Number).filter(Boolean)}
          mancanti={data.denti_mancanti ?? []}
          impianti={data.denti_impianti ?? []}
          onSelezionati={(v: number[]) => onChange({ denti_coinvolti: v.map(String) })}
          onMancanti={(v: number[]) => onChange({ denti_mancanti: v })}
          onImpianti={(v: number[]) => onChange({ denti_impianti: v })}
        />
      </div>

      <div style={sectionSeparator} />

      {/* ═══ COLORI ════════════════════════════════════════════ */}
      <div style={{ marginBottom: '24px' }}>
        <p style={sectionTitle}>Colori</p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
          }}
        >
          {/* Colore dente */}
          <div style={fieldStyle}>
            <label htmlFor="colore_dente" style={labelStyle}>
              Colore dente
            </label>
            <select
              id="colore_dente"
              value={data.colore_dente ?? ''}
              onChange={(e) => onChange({ colore_dente: e.target.value || null })}
              style={{ ...inputBase, appearance: 'none', cursor: 'pointer' }}
            >
              <option value="">—</option>
              {VITA_SCALE.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {/* Colore collo */}
          <div style={fieldStyle}>
            <label htmlFor="colore_collo" style={labelStyle}>
              Colore collo
            </label>
            <select
              id="colore_collo"
              value={data.colore_collo ?? ''}
              onChange={(e) => onChange({ colore_collo: e.target.value || null })}
              style={{ ...inputBase, appearance: 'none', cursor: 'pointer' }}
            >
              <option value="">—</option>
              {VITA_SCALE.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {/* Colore corpo */}
          <div style={fieldStyle}>
            <label htmlFor="colore_corpo" style={labelStyle}>
              Colore corpo
            </label>
            <select
              id="colore_corpo"
              value={data.colore_corpo ?? ''}
              onChange={(e) => onChange({ colore_corpo: e.target.value || null })}
              style={{ ...inputBase, appearance: 'none', cursor: 'pointer' }}
            >
              <option value="">—</option>
              {VITA_SCALE.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {/* Colore incisale */}
          <div style={fieldStyle}>
            <label htmlFor="colore_incisale" style={labelStyle}>
              Colore incisale
            </label>
            <select
              id="colore_incisale"
              value={data.colore_incisale ?? ''}
              onChange={(e) => onChange({ colore_incisale: e.target.value || null })}
              style={{ ...inputBase, appearance: 'none', cursor: 'pointer' }}
            >
              <option value="">—</option>
              {VITA_SCALE.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ═══ D42 T8 — LA TINTA DEL MANUFATTO (D247 · D113) ═══════════════
            Compare SOLO dove il tipo di lavoro la prevede — `famigliaDiMacro`
            è la stessa regola del vincolo `lavori_tinta_tipo_ck`, quindi la
            schermata e il database dicono la stessa cosa.
            🛑 Le voci arrivano dall'alto (`caricaTinteScheda`, lato server):
            se il catalogo non ha risposto, `tinte` è vuoto e la tavolozza non
            compare — meglio niente che una griglia con la sola via di uscita.
            🔑 La tavolozza è LA STESSA del foglietto della scheda: scriverne
            una seconda qui sarebbe la copia libera numero sette del censimento
            della riga 22, fatta col censimento aperto sul tavolo. */}
        {famigliaDiMacro(data.tipo_dispositivo ?? '') !== null && tinte && tinte.length > 0 && (
          <div style={fieldStyle}>
            <label style={labelStyle}>Tinta del manufatto</label>
            <TavolozzaTinte
              tinte={tinte}
              scelta={
                data.tinta_famiglia && data.tinta_codice
                  ? { famiglia: data.tinta_famiglia, codice: data.tinta_codice }
                  : null
              }
              onScegli={(t) =>
                // 🛑 Le due chiavi INSIEME, sempre: `lavori_tinta_coppia_ck`
                //    pretende «entrambe o nessuna», e mandarne una sola
                //    azzererebbe una tinta valida senza dichiararlo.
                onChange({ tinta_famiglia: t?.famiglia ?? null, tinta_codice: t?.codice ?? null })
              }
            />
          </div>
        )}

        {/* Effetti speciali */}
        <div style={fieldStyle}>
          <label htmlFor="effetti_speciali" style={labelStyle}>
            Effetti speciali
          </label>
          <input
            id="effetti_speciali"
            type="text"
            placeholder="Es. caratterizzazioni, crack, macchie..."
            value={data.effetti_speciali ?? ''}
            onChange={(e) => onChange({ effetti_speciali: e.target.value || null })}
            style={inputBase}
          />
        </div>

        {/* Tecnica colore */}
        <div style={fieldStyle}>
          <label htmlFor="tecnica_colore" style={labelStyle}>
            Tecnica colore
          </label>
          <input
            id="tecnica_colore"
            type="text"
            placeholder="Es. layering, cut-back, monolitico..."
            value={data.tecnica_colore ?? ''}
            onChange={(e) => onChange({ tecnica_colore: e.target.value || null })}
            style={inputBase}
          />
        </div>
      </div>

      <div style={sectionSeparator} />

      {/* ═══ ANAMNESI ══════════════════════════════════════════ */}
      <div>
        <p style={sectionTitle}>Anamnesi</p>

        {/* Bruxismo */}
        <div
          style={{
            ...fieldStyle,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <input
            id="anamnesi_bruxismo"
            type="checkbox"
            checked={data.anamnesi_bruxismo ?? false}
            onChange={(e) => onChange({ anamnesi_bruxismo: e.target.checked })}
            style={{
              width: '20px',
              height: '20px',
              minWidth: '20px',
              cursor: 'pointer',
              accentColor: 'var(--gold, #D4A843)',
            }}
          />
          <label
            htmlFor="anamnesi_bruxismo"
            style={{
              fontFamily: 'var(--font-v3, sans-serif)',
              fontSize: '15px',
              color: 'var(--t1, #1C1916)',
              cursor: 'pointer',
            }}
          >
            Paziente bruxista
          </label>
        </div>

        {/* Precauzioni */}
        <div style={fieldStyle}>
          <label htmlFor="anamnesi_precauzioni" style={labelStyle}>
            Precauzioni
          </label>
          <textarea
            id="anamnesi_precauzioni"
            rows={2}
            placeholder="Indicare eventuali precauzioni specifiche..."
            value={data.anamnesi_precauzioni ?? ''}
            onChange={(e) => onChange({ anamnesi_precauzioni: e.target.value || null })}
            style={{ ...inputBase, resize: 'vertical' }}
          />
        </div>

        {/* Altri dispositivi */}
        <div style={fieldStyle}>
          <label htmlFor="anamnesi_altri_dispositivi" style={labelStyle}>
            Altri dispositivi in bocca
          </label>
          <textarea
            id="anamnesi_altri_dispositivi"
            rows={2}
            placeholder="Es. impianti, protesi, apparecchi..."
            value={data.anamnesi_altri_dispositivi ?? ''}
            onChange={(e) =>
              onChange({ anamnesi_altri_dispositivi: e.target.value || null })
            }
            style={{ ...inputBase, resize: 'vertical' }}
          />
        </div>
      </div>
    </div>
  )
}

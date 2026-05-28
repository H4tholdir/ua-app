'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { PecSetupWidget } from '@/components/features/pec/PecSetupWidget'

const STEPS = [
  { id: 'benvenuto', title: 'Benvenuto in UÀ' },
  { id: 'dati', title: 'Dati laboratorio' },
  { id: 'normativo', title: 'Registro sanitario' },
  { id: 'pec', title: 'Configurazione PEC' },
  { id: 'ddc', title: 'Dichiarazione di conformità' },
  { id: 'completo', title: 'Tutto pronto!' },
] as const
type StepId = typeof STEPS[number]['id']

interface Props {
  labId: string
  nomeTitolare: string
  initialData: Record<string, string | boolean | null>
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: '14px', border: 'none',
  background: 'var(--prs, #D4CFC9)',
  boxShadow: 'inset 3px 3px 8px rgba(0,0,0,.13), inset -2px -2px 5px rgba(255,255,255,.70)',
  fontFamily: 'DM Sans, sans-serif', fontSize: '15px', color: 'var(--t1, #1C1916)',
  outline: 'none', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase',
  letterSpacing: '0.08em', marginBottom: '4px', display: 'block',
  fontFamily: 'DM Sans, sans-serif',
}
const btnPrimary: React.CSSProperties = {
  width: '100%', padding: '14px', borderRadius: '16px', border: 'none',
  background: 'var(--primary, #D90012)', color: '#fff',
  fontFamily: 'DM Sans, sans-serif', fontSize: '15px', fontWeight: 700, cursor: 'pointer',
  boxShadow: 'var(--sh-red)',
}
const btnSkip: React.CSSProperties = {
  width: '100%', marginTop: '8px', padding: '10px', background: 'none', border: 'none',
  color: 'var(--t3)', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', cursor: 'pointer',
}

export default function OnboardingWizard({ nomeTitolare, initialData }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<StepId>('benvenuto')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    nome: (initialData.nome as string) ?? '',
    ragione_sociale: (initialData.ragione_sociale as string) ?? '',
    partita_iva: (initialData.partita_iva as string) ?? '',
    indirizzo: (initialData.indirizzo as string) ?? '',
    cap: (initialData.cap as string) ?? '',
    citta: (initialData.citta as string) ?? '',
    provincia: (initialData.provincia as string) ?? '',
    telefono: (initialData.telefono as string) ?? '',
    codice_itca: (initialData.codice_itca as string) ?? '',
    prrc_nome: (initialData.prrc_nome as string) ?? '',
    prrc_qualifica: (initialData.prrc_qualifica as string) ?? '',
    pec: (initialData.pec as string) ?? '',
  })

  const setF = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }))

  const saveLabData = useCallback(async (fields: Partial<typeof form>) => {
    setLoading(true); setError(null)
    const res = await fetch('/api/impostazioni', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    setLoading(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Errore salvataggio')
      return false
    }
    return true
  }, [])

  // Correzione Codex: verifica res.ok prima di navigare
  const complete = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/impostazioni', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ onboarding_completato: true }),
    })
    setLoading(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Errore completamento onboarding')
      return
    }
    router.push('/dashboard')
  }, [router])

  const stepIndex = STEPS.findIndex(s => s.id === step)
  const progress = (stepIndex / (STEPS.length - 1)) * 100

  const renderStep = () => {
    switch (step) {
      case 'benvenuto':
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>👋</div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-.02em', color: 'var(--t1)', marginBottom: '8px', fontFamily: 'DM Sans, sans-serif' }}>
              Ciao {nomeTitolare.split(' ')[0]}!
            </h1>
            <p style={{ fontSize: '15px', color: 'var(--t2)', lineHeight: 1.6, marginBottom: '24px', fontFamily: 'DM Sans, sans-serif' }}>
              In 5 minuti configuriamo tutto. Dal momento in cui finisci, UÀ gestisce il tuo lab da solo.
            </p>
            <button style={btnPrimary} onClick={() => setStep('dati')}>
              Inizia la configurazione →
            </button>
          </div>
        )

      case 'dati':
        return (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px', color: 'var(--t1)', fontFamily: 'DM Sans, sans-serif' }}>Dati del laboratorio</h2>
            <p style={{ fontSize: '13px', color: 'var(--t2)', marginBottom: '20px', fontFamily: 'DM Sans, sans-serif' }}>
              Questi dati appaiono sulle DdC e sulle fatture.
            </p>
            {([
              { key: 'nome', label: 'Nome commerciale *', placeholder: 'Es. Lab Opromolla' },
              { key: 'ragione_sociale', label: 'Ragione sociale', placeholder: 'Se diversa dal nome' },
              { key: 'partita_iva', label: 'Partita IVA *', placeholder: '00000000000' },
              { key: 'indirizzo', label: 'Indirizzo', placeholder: 'Via...' },
              { key: 'cap', label: 'CAP', placeholder: '00000' },
              { key: 'citta', label: 'Città', placeholder: '' },
            ] as { key: string; label: string; placeholder: string }[]).map(({ key, label, placeholder }) => (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                <label style={labelStyle}>{label}</label>
                <input style={inputStyle} value={(form as Record<string, string>)[key]} onChange={setF(key)} placeholder={placeholder} />
              </div>
            ))}
            {error && <div style={{ color: 'var(--primary, #D90012)', fontSize: '13px', marginBottom: '8px', fontFamily: 'DM Sans, sans-serif' }}>{error}</div>}
            <button style={btnPrimary} disabled={loading} onClick={async () => {
              const ok = await saveLabData({ nome: form.nome, ragione_sociale: form.ragione_sociale, partita_iva: form.partita_iva, indirizzo: form.indirizzo, cap: form.cap, citta: form.citta })
              if (ok) setStep('normativo')
            }}>
              {loading ? 'Salvataggio…' : 'Avanti →'}
            </button>
          </div>
        )

      case 'normativo':
        return (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px', color: 'var(--t1)', fontFamily: 'DM Sans, sans-serif' }}>Registro sanitario</h2>
            <p style={{ fontSize: '13px', color: 'var(--t2)', marginBottom: '20px', fontFamily: 'DM Sans, sans-serif' }}>
              Il codice ITCA è obbligatorio per legge (Registro Ministero della Salute). Il PRRC firma le DdC.
            </p>
            {([
              { key: 'codice_itca', label: 'Codice ITCA *', placeholder: 'ITCA01051686' },
              { key: 'prrc_nome', label: 'Nome PRRC *', placeholder: 'Es. Mario Rossi' },
              { key: 'prrc_qualifica', label: 'Qualifica PRRC', placeholder: 'Odontotecnico abilitato' },
            ] as { key: string; label: string; placeholder: string }[]).map(({ key, label, placeholder }) => (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                <label style={labelStyle}>{label}</label>
                <input style={inputStyle} value={(form as Record<string, string>)[key]} onChange={setF(key)} placeholder={placeholder} />
              </div>
            ))}
            <div style={{ background: 'rgba(37,99,235,.06)', borderRadius: '12px', padding: '12px 14px', marginBottom: '16px', fontSize: '12px', color: 'var(--t2)', fontFamily: 'DM Sans, sans-serif' }}>
              ℹ️ Non hai ancora il codice ITCA? Puoi completare questo step dopo.
            </div>
            {error && <div style={{ color: 'var(--primary, #D90012)', fontSize: '13px', marginBottom: '8px', fontFamily: 'DM Sans, sans-serif' }}>{error}</div>}
            <button style={btnPrimary} disabled={loading} onClick={async () => {
              const ok = await saveLabData({ codice_itca: form.codice_itca, prrc_nome: form.prrc_nome, prrc_qualifica: form.prrc_qualifica })
              if (ok) setStep('pec')
            }}>
              {loading ? 'Salvataggio…' : 'Avanti →'}
            </button>
            <button onClick={() => setStep('pec')} style={btnSkip}>Salta per ora</button>
          </div>
        )

      case 'pec':
        return (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px', color: 'var(--t1)', fontFamily: 'DM Sans, sans-serif' }}>
              Configurazione PEC
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--t2)', marginBottom: '20px', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6 }}>
              UÀ invierà le fatture al SDI in automatico via PEC.
            </p>
            <PecSetupWidget
              onSuccess={() => setStep('ddc')}
              onSkip={() => setStep('ddc')}
            />
          </div>
        )

      case 'ddc':
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', color: 'var(--t1)', fontFamily: 'DM Sans, sans-serif' }}>
              Dichiarazione di Conformità
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--t2)', lineHeight: 1.6, marginBottom: '20px', fontFamily: 'DM Sans, sans-serif' }}>
              Per ogni lavoro consegnato, UÀ genera automaticamente la DdC secondo il MDR 2017/745 Allegato XIII.
            </p>
            <div style={{ background: 'rgba(22,163,74,.08)', borderRadius: '14px', padding: '14px 16px', marginBottom: '20px', textAlign: 'left', fontSize: '13px', color: 'var(--t2)', lineHeight: 1.6, fontFamily: 'DM Sans, sans-serif' }}>
              ✅ DdC configurata con:<br/>
              · Codice ITCA: <strong>{form.codice_itca || '(da compilare)'}</strong><br/>
              · PRRC: <strong>{form.prrc_nome || '(da compilare)'}</strong><br/>
              · Riferimento: MDR Art. 52(8) + Allegato XIII
            </div>
            <button style={btnPrimary} onClick={() => setStep('completo')}>
              Ottimo, avanti →
            </button>
          </div>
        )

      case 'completo':
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎉</div>
            <h2 style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '-.02em', marginBottom: '8px', color: 'var(--t1)', fontFamily: 'DM Sans, sans-serif' }}>
              Tutto pronto!
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--t2)', lineHeight: 1.7, marginBottom: '28px', fontFamily: 'DM Sans, sans-serif' }}>
              Il tuo laboratorio è configurato. Inizia subito creando il tuo primo lavoro.
            </p>
            {error && <div style={{ color: 'var(--primary, #D90012)', fontSize: '13px', marginBottom: '8px', fontFamily: 'DM Sans, sans-serif' }}>{error}</div>}
            <button style={btnPrimary} disabled={loading} onClick={complete}>
              {loading ? 'Completamento…' : 'Vai alla dashboard →'}
            </button>
          </div>
        )
    }
  }

  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--bg, #DDD8D3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
      fontFamily: 'DM Sans, sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {step !== 'benvenuto' && step !== 'completo' && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '11px', color: 'var(--t3)', marginBottom: '6px', textAlign: 'right', fontFamily: 'DM Sans, sans-serif' }}>
              {stepIndex} di {STEPS.length - 2}
            </div>
            <div style={{ height: '4px', borderRadius: '99px', background: 'var(--prs)' }}>
              <div style={{ height: '100%', borderRadius: '99px', background: 'var(--primary, #D90012)', width: `${progress}%`, transition: 'width var(--tr)' }} />
            </div>
          </div>
        )}
        <div style={{
          background: 'var(--sfc, #E4DFD9)', borderRadius: '28px', padding: '32px 24px',
          boxShadow: 'var(--sh-b)',
        }}>
          {renderStep()}
        </div>
      </div>
    </div>
  )
}

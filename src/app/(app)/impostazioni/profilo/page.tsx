'use client'
import { useState, useCallback } from 'react'
import { getBrowserClient } from '@/lib/supabase/browser-anon'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { useRouter } from 'next/navigation'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: '12px', border: 'none',
  background: 'var(--prs, #D4CFC9)',
  boxShadow: 'inset 3px 3px 8px rgba(0,0,0,.13), inset -2px -2px 5px rgba(255,255,255,.70)',
  fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'var(--t1, #1C1916)',
  outline: 'none', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase',
  letterSpacing: '0.08em', marginBottom: '4px', display: 'block',
  fontFamily: 'DM Sans, sans-serif',
}
const cardStyle: React.CSSProperties = {
  background: 'var(--sfc, #E4DFD9)', borderRadius: '18px', padding: '20px',
  boxShadow: 'var(--sh-b)',
  marginBottom: '12px',
}

export default function ProfiloPage() {
  const router = useRouter()
  const [pwd, setPwd] = useState({ new_: '', confirm: '' })
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdMsg, setPwdMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const handleChangePwd = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (pwd.new_ !== pwd.confirm) {
      setPwdMsg({ type: 'err', text: 'Le nuove password non coincidono.' }); return
    }
    if (pwd.new_.length < 8) {
      setPwdMsg({ type: 'err', text: 'La password deve essere almeno 8 caratteri.' }); return
    }
    setPwdLoading(true); setPwdMsg(null)
    const sb = getBrowserClient()
    const { error } = await sb.auth.updateUser({ password: pwd.new_ })
    setPwdLoading(false)
    if (error) {
      setPwdMsg({ type: 'err', text: error.message })
    } else {
      setPwdMsg({ type: 'ok', text: 'Password aggiornata. Verrai reindirizzato al login.' })
      setTimeout(async () => { await sb.auth.signOut(); router.push('/login') }, 2000)
    }
  }, [pwd, router])

  const btnPrimary: React.CSSProperties = {
    padding: '10px 22px', borderRadius: '12px', border: 'none',
    background: 'var(--primary, #D90012)', color: '#fff',
    fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
    boxShadow: 'var(--sh-red)',
  }

  return (
    <>
      <AppHeader title="Profilo" backHref="/impostazioni" />
      <PageWrapper>
        <div style={{ padding: '0 20px 48px', maxWidth: '480px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.1em', margin: '0 0 8px', fontFamily: 'DM Sans, sans-serif' }}>
            Sicurezza
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--t1)', marginBottom: '14px', fontFamily: 'DM Sans, sans-serif' }}>
              Cambia password
            </div>
            <form onSubmit={handleChangePwd}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                <label style={labelStyle}>Nuova password *</label>
                <input style={inputStyle} type="password" value={pwd.new_}
                  onChange={e => setPwd(p => ({ ...p, new_: e.target.value }))}
                  placeholder="Almeno 8 caratteri" required minLength={8} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '14px' }}>
                <label style={labelStyle}>Conferma nuova password *</label>
                <input style={inputStyle} type="password" value={pwd.confirm}
                  onChange={e => setPwd(p => ({ ...p, confirm: e.target.value }))}
                  placeholder="Ripeti la nuova password" required />
              </div>
              <button type="submit" disabled={pwdLoading} style={{ ...btnPrimary, opacity: pwdLoading ? .6 : 1 }}>
                {pwdLoading ? 'Aggiornamento…' : 'Aggiorna password'}
              </button>
              {pwdMsg && (
                <div style={{ marginTop: '10px', padding: '8px 14px', borderRadius: '10px', fontSize: '13px', fontFamily: 'DM Sans, sans-serif',
                  background: pwdMsg.type === 'ok' ? 'rgba(22,163,74,.08)' : 'rgba(217,0,18,.07)',
                  color: pwdMsg.type === 'ok' ? '#16A34A' : '#D90012' }}>
                  {pwdMsg.text}
                </div>
              )}
            </form>
          </div>

          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.1em', margin: '16px 0 8px', fontFamily: 'DM Sans, sans-serif' }}>
            Account
          </div>
          <div style={cardStyle}>
            <p style={{ fontSize: '13px', color: 'var(--t2)', lineHeight: 1.6, fontFamily: 'DM Sans, sans-serif', margin: 0 }}>
              Per modificare nome, cognome o email contatta il supporto: <strong>supporto@ua.app</strong>
            </p>
            <p style={{ fontSize: '12px', color: 'var(--t3)', marginTop: '8px', fontFamily: 'DM Sans, sans-serif' }}>
              La modifica dell&rsquo;email richiede verifica. Disponibile nella versione V1.1.
            </p>
          </div>
        </div>
      </PageWrapper>
    </>
  )
}

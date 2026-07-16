import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { trovaParoleVietate } from '@/design-system/v3/dizionario'

const suonaMock = vi.fn()
const vibraMock = vi.fn()
vi.mock('@/design-system/v3/sound', () => ({ suona: (n: string) => suonaMock(n) }))
vi.mock('@/design-system/v3/haptic', () => ({ vibra: (t: string) => vibraMock(t) }))

import { TastoWhatsApp } from '@/components/ds/TastoWhatsApp'

const URL_OK = 'https://wa.me/393331234567?text=Lavoro%20n.147'

describe('TastoWhatsApp — verde dedicato (§5.29)', () => {
  beforeEach(() => { suonaMock.mockClear(); vibraMock.mockClear() })

  it('renderizza un link target=_blank rel=noopener noreferrer verso waUrl', () => {
    render(<TastoWhatsApp waUrl={URL_OK}>Invia messaggio WhatsApp</TastoWhatsApp>)
    const link = screen.getByRole('link', { name: /whatsapp/i })
    expect(link).toHaveAttribute('href', URL_OK)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('usa il gradiente dedicato §3.3.4 (mai il verde di stato)', () => {
    render(<TastoWhatsApp waUrl={URL_OK}>Invia messaggio WhatsApp</TastoWhatsApp>)
    const link = screen.getByRole('link', { name: /whatsapp/i })
    expect(link.style.background).toContain('linear-gradient')
    // jsdom normalizza gli hex nei gradient in rgb(): #208650 → rgb(32, 134, 80)
    expect(link.style.background).toContain('rgb(32, 134, 80)')
  })

  it('waUrl non-wa.me: NON renderizza il link (contratto sicurezza)', () => {
    vi.stubEnv('NODE_ENV', 'development')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = render(
      <TastoWhatsApp waUrl={'javascript:alert(1)'}>Invia</TastoWhatsApp>
    )
    expect(container.querySelector('a')).toBeNull()
    expect(warn).toHaveBeenCalled()
    vi.unstubAllEnvs()
  })

  it('click → suona("tap") + vibra("medium")', () => {
    render(<TastoWhatsApp waUrl={URL_OK}>Invia messaggio WhatsApp</TastoWhatsApp>)
    fireEvent.click(screen.getByRole('link', { name: /whatsapp/i }))
    expect(suonaMock).toHaveBeenCalledWith('tap')
    expect(vibraMock).toHaveBeenCalledWith('medium')
  })

  it('focus ring di legge nel proprio <style>', () => {
    const { container } = render(<TastoWhatsApp waUrl={URL_OK}>Invia</TastoWhatsApp>)
    const css = container.querySelector('style')?.textContent ?? ''
    expect(css).toContain('outline: 2px solid var(--blue)')
  })

  it('testo default passa il dizionario', () => {
    const { container } = render(<TastoWhatsApp waUrl={URL_OK}>Invia messaggio WhatsApp</TastoWhatsApp>)
    expect(trovaParoleVietate(container.textContent ?? '')).toEqual([])
  })
})

// tests/unit/server-timing.test.ts
// Test per src/lib/api/server-timing.ts (spec R2 §Task 9). Convenzione repo:
// file flat in tests/unit/ (vitest.config.ts non scopre src/lib/**/__tests__,
// vedi task-2-report.md).
import { describe, it, expect } from 'vitest'
import { NextResponse } from 'next/server'
import { withServerTiming } from '@/lib/api/server-timing'

describe('withServerTiming', () => {
  it('handler valorizza il sink (authMs + dbMs) → header con 3 fasi auth, db, total', async () => {
    const res = await withServerTiming(async (t) => {
      t.authMs = 12
      t.dbMs = 34
      return NextResponse.json({ ok: true })
    })

    const header = res.headers.get('Server-Timing')
    expect(header).toMatch(/^auth;dur=12, db;dur=34, total;dur=\d+$/)
  })

  it('handler NON valorizza il sink → header con sola fase total', async () => {
    const res = await withServerTiming(async () => {
      return NextResponse.json({ ok: true })
    })

    const header = res.headers.get('Server-Timing')
    expect(header).toMatch(/^total;dur=\d+$/)
  })

  it('handler valorizza solo authMs (dbMs assente, es. context null → 401 pre-DB) → auth + total, NO db', async () => {
    const res = await withServerTiming(async (t) => {
      t.authMs = 7
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    })

    const header = res.headers.get('Server-Timing')
    expect(header).toMatch(/^auth;dur=7, total;dur=\d+$/)
    expect(res.status).toBe(401)
  })

  it('propaga la NextResponse del handler invariata (status, body) oltre all-header', async () => {
    const res = await withServerTiming(async (t) => {
      t.authMs = 1
      t.dbMs = 2
      return NextResponse.json({ clienti: [] }, { status: 200 })
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ clienti: [] })
  })
})

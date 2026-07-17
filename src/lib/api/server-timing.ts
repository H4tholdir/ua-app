import 'server-only'
import type { NextResponse } from 'next/server'
import type { ContextTimings } from '@/lib/supabase/lab-context'

// Wrapper Server-Timing per handler GET categoria A (spec R2 §Task 9).
// L'handler valorizza il sink `t` (authMs/dbMs, tipicamente da
// getLabContextWithTimings()) e ritorna la NextResponse invariata; questo
// wrapper aggiunge l'header `Server-Timing` con le fasi disponibili.
// NON generico (verbatim dal brief): un generico su <T> rompe l'inferenza
// TS quando il body dell'handler ritorna una union di più shape di
// NextResponse.json diverse (comune in quasi tutti i 28 file — vedi
// task-9-report.md). I pochi handler con un tipo di ritorno esplicito
// stretto (es. api/dashboard/kpi) vanno invece rilassati a `NextResponse`
// non parametrizzata nella loro firma.
export async function withServerTiming(
  handler: (t: Partial<ContextTimings>) => Promise<NextResponse>
): Promise<NextResponse> {
  const t: Partial<ContextTimings> = {}
  const t0 = performance.now()
  const res = await handler(t)
  const parts: string[] = []
  if (t.authMs !== undefined) parts.push(`auth;dur=${Math.round(t.authMs)}`)
  if (t.dbMs !== undefined) parts.push(`db;dur=${Math.round(t.dbMs)}`)
  parts.push(`total;dur=${Math.round(performance.now() - t0)}`)
  res.headers.set('Server-Timing', parts.join(', '))
  return res
}

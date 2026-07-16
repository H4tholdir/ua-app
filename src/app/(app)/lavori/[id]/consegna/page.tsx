// Ondata 16/07 (D-5, sp.3 §8 A3): la pagina intermedia è MORTA. Il rito vive
// in FlussoConsegna, dentro scheda e pile. Questo redirect tiene vivi i
// deep-link/bookmark: ?consegna=1 auto-apre il flusso nella scheda.
import { redirect } from 'next/navigation'

export default async function ConsegnaRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/lavori/${id}?consegna=1`)
}

'use client'

import { useEffect, useCallback, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { hapticLight } from '@/lib/feedback/haptic'
import { isNuovaRichiestaDentista } from '@/lib/portale/richiesta-dentista'

export type TipoNotifica = 'segnalazione' | 'pronto' | 'ordine_dentista' | 'urgente'

export interface Notifica {
  id: string           // uuid generato lato client
  tipo: TipoNotifica
  titolo: string
  sub: string
  href?: string        // link "Vai →"
  cta?: string         // label pulsante
  timestamp: number
}

export function useRealtimeNotifiche(
  laboratorioId: string | null,
  ruolo: string | null,
) {
  const [notifiche, setNotifiche] = useState<Notifica[]>([])
  const [isConnected, setIsConnected] = useState(false)

  const push = useCallback((n: Omit<Notifica, 'id' | 'timestamp'>) => {
    setNotifiche(prev => [
      { ...n, id: crypto.randomUUID(), timestamp: Date.now() },
      ...prev.slice(0, 2), // max 3 toast visibili
    ])
  }, [])

  const dismiss = useCallback((id: string) => {
    setNotifiche(prev => prev.filter(n => n.id !== id))
  }, [])

  useEffect(() => {
    if (!laboratorioId) return

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    // Canale: aggiornamenti lavori del lab
    const channel = supabase
      .channel(`lab-${laboratorioId}-notifiche`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'lavori',
          filter: `laboratorio_id=eq.${laboratorioId}`,
        },
        (payload) => {
          const old = payload.old as Record<string, unknown>
          const nuovo = payload.new as Record<string, unknown>

          // Segnalazione: nuovo segnalazione_tipo (solo per titolare/admin_rete)
          if (
            nuovo.segnalazione_tipo &&
            !old.segnalazione_tipo &&
            (ruolo === 'titolare' || ruolo === 'admin_rete')
          ) {
            push({
              tipo: 'segnalazione',
              titolo: 'Problema segnalato',
              sub: `${nuovo.numero_lavoro} · ${tipoSegnalazioneLabel(nuovo.segnalazione_tipo as string)}`,
              href: `/lavori/${nuovo.id}`,
              cta: 'Vai →',
            })
            hapticLight()
          }

          // Lavoro pronto: passaggio a stato 'pronto'
          if (
            nuovo.stato === 'pronto' &&
            old.stato !== 'pronto' &&
            (ruolo === 'titolare' || ruolo === 'front_desk')
          ) {
            push({
              tipo: 'pronto',
              titolo: 'Lavoro pronto',
              sub: `${nuovo.numero_lavoro} · pronto per la consegna`,
              href: `/lavori/${nuovo.id}`,
              cta: 'Consegna',
            })
          }

          // Urgente: priorità cambia a urgente/extra_urgente
          if (
            ['urgente', 'extra_urgente'].includes(nuovo.priorita as string) &&
            !['urgente', 'extra_urgente'].includes((old.priorita ?? '') as string)
          ) {
            push({
              tipo: 'urgente',
              titolo: nuovo.priorita === 'extra_urgente' ? '⚡ Extra urgente!' : '↑ Urgente',
              sub: `${nuovo.numero_lavoro}`,
              href: `/lavori/${nuovo.id}`,
              cta: 'Apri',
            })
          }
        },
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    // Canale: nuovo lavoro in bozza da dentista (INSERT con flag da_portale=true)
    const channelNuovi = supabase
      .channel(`lab-${laboratorioId}-nuovi`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lavori',
          filter: `laboratorio_id=eq.${laboratorioId}`,
        },
        (payload) => {
          const nuovo = payload.new as Record<string, unknown>
          // Ondata 3b: rileva l'origine-portale dal flag pulito, non più da
          // note_interne (che ora resta vuota per i lavori da portale).
          if (isNuovaRichiestaDentista(nuovo, ruolo ?? '')) {
            push({
              tipo: 'ordine_dentista',
              titolo: 'Nuova richiesta dentista',
              sub: `${nuovo.numero_lavoro} · ${nuovo.tipo_dispositivo ?? ''} · ${nuovo.descrizione ?? ''}`.substring(0, 60),
              href: `/lavori/${nuovo.id}`,
              cta: 'Apri →',
            })
          }
        },
      )
      .subscribe()

    return () => {
      setIsConnected(false)
      void supabase.removeChannel(channel)
      void supabase.removeChannel(channelNuovi)
    }
  }, [laboratorioId, ruolo, push])

  return { notifiche, dismiss, isConnected }
}

function tipoSegnalazioneLabel(tipo: string): string {
  const map: Record<string, string> = {
    impronta_non_idonea: 'Impronta non idonea',
    colore_mancante: 'Colore non specificato',
    istruzione_poco_chiara: 'Istruzione poco chiara',
    materiale_esaurito: 'Materiale esaurito',
    altro: 'Altro',
  }
  return map[tipo] ?? tipo
}

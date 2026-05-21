'use client'
/**
 * PushRegistrar — Task B7
 * Componente client invisibile che registra la push subscription del browser
 * e la sincronizza con il server tramite POST /api/notifications/subscribe.
 *
 * Viene montato in (app)/layout.tsx accanto a <SwRegistration />.
 * Usa navigator.serviceWorker.ready — attende che il SW sia attivo prima
 * di tentare la subscription, quindi l'ordine nel DOM non è critico.
 */
import { useEffect } from 'react'

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const buffer = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    buffer[i] = rawData.charCodeAt(i)
  }
  return buffer.buffer as ArrayBuffer
}

async function syncSubscriptionWithServer(subscription: PushSubscription): Promise<void> {
  await fetch('/api/notifications/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription),
  })
}

export function PushRegistrar() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.ready

        // Se esiste già una subscription, la risincronizza per tenerla fresca
        const existing = await registration.pushManager.getSubscription()
        if (existing) {
          await syncSubscriptionWithServer(existing)
          return
        }

        // Prima sottoscrizione: chiede il permesso
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
          ),
        })

        await syncSubscriptionWithServer(subscription)
      } catch {
        // Push non supportato o utente ha negato — fallimento silenzioso
      }
    }

    register()
  }, [])

  return null
}

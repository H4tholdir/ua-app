"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"
import { useTheme } from "@/hooks/useTheme"

const Toaster = ({ ...props }: ToasterProps) => {
  // Prima l'import veniva da next-themes, di cui nessun provider e' mai stato
  // montato: il valore restava sempre "system", cioe' i messaggini seguivano il
  // telefono e ignoravano la preferenza dell'utente. Ora arriva dal nostro hook,
  // che e' l'unica regola. Si passa il tema GIA' RISOLTO, non "system": Sonner
  // altrimenti lo risolverebbe da capo per conto suo, ricreando il problema.
  const { temaRisolto } = useTheme()

  return (
    <Sonner
      theme={temaRisolto}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }

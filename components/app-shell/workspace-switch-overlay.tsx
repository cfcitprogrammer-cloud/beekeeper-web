"use client"

import { Building2, Loader2 } from "lucide-react"

export function WorkspaceSwitchOverlay({
  workspaceName,
}: {
  workspaceName: string
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[120] flex items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <div className="flex w-[min(20rem,calc(100vw-2rem))] flex-col items-center gap-3 rounded-lg border bg-card px-6 py-6 text-center shadow-lg">
        <span className="flex size-10 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
          <Building2 className="size-5" />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-medium">Changing workspace…</p>
          <p className="text-xs text-muted-foreground">
            Loading data for{" "}
            <span className="font-medium text-foreground">{workspaceName}</span>
          </p>
        </div>
        <Loader2 className="size-4 animate-spin text-primary" />
      </div>
    </div>
  )
}

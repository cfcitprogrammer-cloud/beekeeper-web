"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { Loader2 } from "lucide-react"

export function NavigationLoader() {
  const pathname = usePathname()
  const [loading, setLoading] = React.useState(false)
  const previousPath = React.useRef(pathname)

  React.useEffect(() => {
    if (previousPath.current !== pathname) {
      setLoading(false)
      previousPath.current = pathname
    }
  }, [pathname])

  React.useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null
      const anchor = target?.closest("a") as HTMLAnchorElement | null
      if (!anchor) return
      const href = anchor.getAttribute("href")
      if (!href || href.startsWith("#") || href.startsWith("mailto:")) return
      if (anchor.target === "_blank") return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      // Only internal navigations.
      if (href.startsWith("http") && !href.startsWith(window.location.origin))
        return
      setLoading(true)
    }
    document.addEventListener("click", onClick, true)
    return () => document.removeEventListener("click", onClick, true)
  }, [])

  // Safety: hide after a few seconds in case navigation stalls.
  React.useEffect(() => {
    if (!loading) return
    const timer = window.setTimeout(() => setLoading(false), 8000)
    return () => window.clearTimeout(timer)
  }, [loading])

  if (!loading) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/60 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="size-6 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Loading…</p>
      </div>
    </div>
  )
}

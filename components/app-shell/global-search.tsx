"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  CalendarDays,
  Clock3,
  Fingerprint,
  LayoutDashboard,
  Package,
  Search,
  ShieldCheck,
  ShoppingCart,
  Store,
  Users,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const quickLinks = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, group: "Overview" },
  { title: "Employee directory", href: "/employees", icon: Users, group: "People" },
  { title: "Onboard employee", href: "/employees/new", icon: Users, group: "People" },
  { title: "Leave review queue", href: "/leave/requests", icon: CalendarDays, group: "People" },
  { title: "Leave balances", href: "/leave/balances", icon: CalendarDays, group: "People" },
  { title: "Live attendance", href: "/attendance", icon: Fingerprint, group: "Time & attendance" },
  { title: "Daily summary", href: "/attendance/daily-summary", icon: Clock3, group: "Time & attendance" },
  { title: "Shift configurator", href: "/shifts", icon: Clock3, group: "Time & attendance" },
  { title: "Outlet directory", href: "/outlets", icon: Store, group: "Field operations" },
  { title: "SKU catalog", href: "/inventory/skus", icon: Package, group: "Field operations" },
  { title: "Bookings register", href: "/bookings", icon: ShoppingCart, group: "Field operations" },
  { title: "Approval inbox", href: "/approvals/inbox", icon: ShieldCheck, group: "Governance" },
  { title: "Approval templates", href: "/approvals/templates", icon: ShieldCheck, group: "Governance" },
]

export function GlobalSearch() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen((value) => !value)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const results = React.useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return quickLinks
    return quickLinks.filter(
      (link) =>
        link.title.toLowerCase().includes(term) ||
        link.group.toLowerCase().includes(term)
    )
  }, [query])

  function go(href: string) {
    setOpen(false)
    setQuery("")
    router.push(href)
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="hidden h-8 w-56 justify-start gap-2 text-muted-foreground md:inline-flex"
      >
        <Search className="size-3.5" />
        <span className="flex-1 text-left">Search or jump to…</span>
        <kbd className="rounded border bg-muted px-1 font-mono text-[0.5625rem] text-muted-foreground">
          ⌘K
        </kbd>
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setOpen(true)}
        className="md:hidden"
        aria-label="Search"
      >
        <Search />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-24 translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Search the workspace</DialogTitle>
            <DialogDescription>
              Jump to a module or record in the workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="size-4 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search modules, people, outlets…"
              className="h-11 border-0 bg-transparent px-0 focus-visible:ring-0 dark:bg-transparent"
            />
            <kbd className="rounded border bg-muted px-1 font-mono text-[0.5625rem] text-muted-foreground">
              ESC
            </kbd>
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {results.length === 0 ? (
              <p className="px-3 py-8 text-center text-xs text-muted-foreground">
                No results for “{query}”.
              </p>
            ) : (
              results.map((link) => {
                const Icon = link.icon
                return (
                  <button
                    key={link.href}
                    type="button"
                    onClick={() => go(link.href)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-xs transition-colors",
                      "hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                    )}
                  >
                    <span className="flex size-7 items-center justify-center rounded-md border bg-card text-muted-foreground">
                      <Icon className="size-3.5" />
                    </span>
                    <span className="flex-1">
                      <span className="block font-medium">{link.title}</span>
                      <span className="block text-[0.625rem] text-muted-foreground">
                        {link.group}
                      </span>
                    </span>
                    <span className="text-[0.625rem] text-muted-foreground">
                      ↵
                    </span>
                  </button>
                )
              })
            )}
          </div>
          <div className="flex items-center justify-between border-t bg-muted/30 px-3 py-2 text-[0.625rem] text-muted-foreground">
            <span>Quick navigation</span>
            <Link href="/employees" onClick={() => setOpen(false)} className="hover:text-foreground">
              Browse employees →
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

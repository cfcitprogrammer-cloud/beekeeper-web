"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Activity,
  ArrowLeftRight,
  CalendarDays,
  Clock3,
  Factory,
  Fingerprint,
  LayoutDashboard,
  MapPinned,
  Package,
  Receipt,
  Route,
  Search,
  ShieldCheck,
  ShoppingCart,
  Store,
  Tags,
  Users,
  Wallet,
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
  { title: "Departments", href: "/employees/departments", icon: Users, group: "People" },
  { title: "Positions", href: "/employees/positions", icon: Users, group: "People" },
  { title: "Leave review queue", href: "/leave/requests", icon: CalendarDays, group: "People" },
  { title: "Leave balances", href: "/leave/balances", icon: CalendarDays, group: "People" },
  { title: "Leave types", href: "/leave/types", icon: CalendarDays, group: "People" },
  { title: "Live attendance", href: "/attendance", icon: Fingerprint, group: "Time & attendance" },
  { title: "Daily summary", href: "/attendance/daily-summary", icon: Clock3, group: "Time & attendance" },
  { title: "Shift templates", href: "/shifts", icon: Clock3, group: "Time & attendance" },
  { title: "Employee schedules", href: "/shifts/schedules", icon: Clock3, group: "Time & attendance" },
  { title: "Holidays", href: "/attendance/holidays", icon: Clock3, group: "Time & attendance" },
  { title: "Attendance locations", href: "/attendance/locations", icon: Clock3, group: "Time & attendance" },
  { title: "Outlet directory", href: "/outlets", icon: Store, group: "Field operations" },
  { title: "Outlet assignments", href: "/outlets/assignments", icon: MapPinned, group: "Field operations" },
  { title: "Visits", href: "/visits", icon: Route, group: "Field operations" },
  { title: "Visit plans", href: "/visits/plans", icon: CalendarDays, group: "Field operations" },
  { title: "Visit log", href: "/visits/log", icon: Route, group: "Field operations" },
  { title: "Check in visit", href: "/visits/check-in", icon: MapPinned, group: "Field operations" },
  { title: "Expenses", href: "/expenses", icon: Wallet, group: "Field operations" },
  { title: "Expense items", href: "/expenses/items", icon: Receipt, group: "Field operations" },
  { title: "Expense plans", href: "/expenses/plans", icon: Wallet, group: "Field operations" },
  { title: "Expense categories", href: "/expenses/categories", icon: Tags, group: "Field operations" },
  { title: "Production", href: "/production", icon: Factory, group: "Field operations" },
  { title: "SKU catalog", href: "/inventory/skus", icon: Package, group: "Field operations" },
  { title: "SKU categories", href: "/inventory/categories", icon: Package, group: "Field operations" },
  { title: "Bookings register", href: "/bookings", icon: ShoppingCart, group: "Field operations" },
  { title: "Activity feed", href: "/feed", icon: Activity, group: "Overview" },
  { title: "Import & export", href: "/import-export", icon: ArrowLeftRight, group: "Data" },
  { title: "Approval inbox", href: "/approvals/inbox", icon: ShieldCheck, group: "Governance" },
  { title: "Approval stages", href: "/approvals/stages", icon: ShieldCheck, group: "Governance" },
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

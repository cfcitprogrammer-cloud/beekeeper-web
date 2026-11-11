"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Bell,
  Building2,
  CheckCheck,
  ChevronRight,
  LogOut,
  Settings2,
  ShieldCheck,
  UserRound,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { logout } from "@/actions/auth.action"
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { formatRelative } from "@/lib/format"
import type { MyPendingApproval } from "@/types/database"

import { GlobalSearch } from "./global-search"
import { ThemeToggle } from "./theme-toggle"

const segmentLabels: Record<string, string> = {
  dashboard: "Dashboard",
  employees: "Employees",
  new: "Onboard employee",
  attendance: "Attendance",
  "daily-summary": "Daily summary",
  shifts: "Shifts",
  leave: "Leave",
  requests: "Review queue",
  balances: "Balances",
  outlets: "Outlets",
  workspaces: "Workspaces",
  inventory: "Inventory",
  skus: "SKU catalog",
  bookings: "Bookings",
  approvals: "Approvals",
  inbox: "Inbox",
  templates: "Templates",
  assignments: "Assignments",
  expenses: "Expenses",
  production: "Production",
  pipelines: "Pipelines",
  stages: "Stages",
  usage: "Usage",
  visits: "Visits",
  "import-export": "Import & export",
  feed: "Activity feed",
}

function useBreadcrumbs() {
  const pathname = usePathname()
  return React.useMemo(() => {
    const segments = pathname.split("/").filter(Boolean)
    return segments.map((segment, index) => {
      const href = "/" + segments.slice(0, index + 1).join("/")
      const previous = segments[index - 1]
      let label =
        segmentLabels[segment] ??
        segment
          .replace(/-/g, " ")
          .replace(/\b\w/g, (char) => char.toUpperCase())

      if (
        !segmentLabels[segment] &&
        (previous === "employees" ||
          previous === "bookings" ||
          previous === "outlets")
      ) {
        label =
          previous === "employees"
            ? "Employee details"
            : previous === "bookings"
              ? "Booking details"
              : "Outlet details"
      }

      return { href, label, isLast: index === segments.length - 1 }
    })
  }, [pathname])
}

export function Topbar({
  companyName,
  workspaceName,
  user,
  permissions,
  pendingApprovals,
}: {
  companyName: string
  workspaceName: string
  user: { name: string; email: string; role: string; initials: string }
  permissions: string[]
  pendingApprovals: MyPendingApproval[]
}) {
  const breadcrumbs = useBreadcrumbs()
  const pendingCount = pendingApprovals.length
  const canViewApprovals = hasPermission(
    permissions,
    PERMISSIONS.APPROVALS_VIEW
  )

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur supports-backdrop-filter:bg-background/70">
      <SidebarTrigger className="-ml-0.5" />
      <Separator orientation="vertical" className="mx-1 h-4" />

      <nav
        aria-label="Breadcrumb"
        className="hidden min-w-0 items-center gap-1 md:flex"
      >
        <Link
          href="/dashboard"
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Workspace
        </Link>
        {breadcrumbs.map((crumb) => (
          <React.Fragment key={crumb.href}>
            <ChevronRight className="size-3 text-muted-foreground/60" />
            {crumb.isLast ? (
              <span className="truncate text-xs font-medium">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="truncate text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {crumb.label}
              </Link>
            )}
          </React.Fragment>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-1.5">
        <div className="mr-1 hidden items-center gap-1.5 rounded-md border bg-muted/30 px-2 py-1 text-[0.625rem] text-muted-foreground xl:flex">
          <Building2 className="size-3" />
          <span className="max-w-40 truncate font-medium text-foreground">
            {workspaceName}
          </span>
          <span className="text-muted-foreground/60">·</span>
          <span className="max-w-32 truncate">{companyName}</span>
        </div>

        <GlobalSearch />
        <ThemeToggle />

        {canViewApprovals && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="relative"
                  aria-label={`${pendingCount} pending approvals`}
                />
              }
            >
              <Bell />
              {pendingCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.5625rem] font-semibold text-primary-foreground">
                  {pendingCount}
                </span>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="w-80">
              <div className="flex items-center justify-between px-2 py-1.5">
                <div>
                  <p className="text-xs font-medium">Approval notifications</p>
                  <p className="text-[0.625rem] text-muted-foreground">
                    {pendingCount} document{pendingCount === 1 ? "" : "s"}{" "}
                    waiting for your decision
                  </p>
                </div>
                <Badge variant="secondary" className="text-[0.5625rem]">
                  {pendingCount}
                </Badge>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {pendingApprovals.slice(0, 4).map((approval) => (
                  <DropdownMenuItem
                    key={approval.request_stage_id}
                    render={<Link href="/approvals/inbox" />}
                    className="items-start gap-2 py-2"
                  >
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <ShieldCheck className="size-3" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.6875rem] font-medium">
                        {approval.title}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-[0.625rem] text-muted-foreground">
                        <span>{approval.document_no}</span>
                        <span>·</span>
                        <span className="truncate">{approval.stage_name}</span>
                      </span>
                      <span className="mt-0.5 block text-[0.5625rem] text-muted-foreground/80">
                        {formatRelative(approval.submitted_at)}
                      </span>
                    </span>
                  </DropdownMenuItem>
                ))}
                {pendingCount === 0 && (
                  <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                    <CheckCheck className="mx-auto mb-2 size-5 text-emerald-500" />
                    You are all caught up.
                  </div>
                )}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                render={<Link href="/approvals/inbox" />}
                className="justify-center text-xs font-medium"
              >
                Open approval inbox
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Separator orientation="vertical" className="mx-0.5 h-4" />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-2 px-1.5"
                aria-label="User menu"
              />
            }
          >
            <Avatar className="size-6.5">
              <AvatarFallback className="bg-primary/10 text-[0.5625rem] font-semibold text-primary">
                {user.initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden max-w-28 truncate text-[0.6875rem] font-medium sm:block">
              {user.name}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-60">
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 p-1.5">
                <Avatar className="size-8 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-primary/10 text-[0.625rem] font-semibold text-primary">
                    {user.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid min-w-0 flex-1 leading-tight">
                  <span className="truncate text-xs font-medium">
                    {user.name}
                  </span>
                  <span className="truncate text-[0.625rem] text-muted-foreground">
                    {user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {hasPermission(permissions, PERMISSIONS.EMPLOYEES_VIEW) && (
                <DropdownMenuItem className="gap-2">
                  <UserRound className="size-3.5" />
                  My profile
                </DropdownMenuItem>
              )}
              {canViewApprovals && (
                <DropdownMenuItem
                  render={<Link href="/approvals/inbox" />}
                  className="gap-2"
                >
                  <ShieldCheck className="size-3.5" />
                  My approvals
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="gap-2">
                <Settings2 className="size-3.5" />
                Preferences
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              className="gap-2"
              onClick={() => void logout()}
            >
              <LogOut className="size-3.5" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

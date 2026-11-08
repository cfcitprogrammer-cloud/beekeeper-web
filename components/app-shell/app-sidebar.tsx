"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Activity,
  ArrowLeftRight,
  BarChart3,
  Building2,
  CalendarDays,
  ChevronRight,
  Clock3,
  Factory,
  Fingerprint,
  Hexagon,
  LayoutDashboard,
  MapPinned,
  Package,
  Route,
  ShieldCheck,
  ShoppingCart,
  Store,
  Users,
  Wallet,
} from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  hasPermission,
  PERMISSIONS,
  type PermissionKey,
} from "@/lib/auth/permissions"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"

import { SidebarWorkspaceSwitcher } from "./workspace-switcher"
import { SidebarUser } from "./sidebar-user"

type NavChild = {
  title: string
  href: string
  badge?: number
  permission?: PermissionKey
}

type NavItem = {
  title: string
  href: string
  icon: React.ElementType
  permission?: PermissionKey
  superAdminOnly?: boolean
  children?: NavChild[]
}

type NavSection = {
  label: string
  items: NavItem[]
}

export const navSections: NavSection[] = [
  {
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        permission: PERMISSIONS.DASHBOARD_VIEW,
      },
      {
        title: "Activity feed",
        href: "/feed",
        icon: Activity,
        permission: PERMISSIONS.FEED_VIEW,
      },
    ],
  },
  {
    label: "People",
    items: [
      {
        title: "Employees",
        href: "/employees",
        icon: Users,
        permission: PERMISSIONS.EMPLOYEES_VIEW,
        children: [
          {
            title: "Directory",
            href: "/employees",
            permission: PERMISSIONS.EMPLOYEES_VIEW,
          },
          {
            title: "Onboard employee",
            href: "/employees/new",
            permission: PERMISSIONS.EMPLOYEES_CREATE,
          },
          {
            title: "Departments",
            href: "/employees/departments",
            permission: PERMISSIONS.EMPLOYEES_VIEW,
          },
          {
            title: "Positions",
            href: "/employees/positions",
            permission: PERMISSIONS.EMPLOYEES_VIEW,
          },
        ],
      },
      {
        title: "Leave",
        href: "/leave/requests",
        icon: CalendarDays,
        permission: PERMISSIONS.LEAVE_VIEW,
        children: [
          {
            title: "Review queue",
            href: "/leave/requests",
            permission: PERMISSIONS.LEAVE_REVIEW,
          },
          {
            title: "Balances",
            href: "/leave/balances",
            permission: PERMISSIONS.LEAVE_VIEW,
          },
          {
            title: "Types",
            href: "/leave/types",
            permission: PERMISSIONS.LEAVE_VIEW,
          },
        ],
      },
    ],
  },
  {
    label: "Time & attendance",
    items: [
      {
        title: "Attendance",
        href: "/attendance",
        icon: Fingerprint,
        permission: PERMISSIONS.ATTENDANCE_VIEW,
        children: [
          {
            title: "Live feed",
            href: "/attendance",
            permission: PERMISSIONS.ATTENDANCE_VIEW,
          },
          {
            title: "Daily summary",
            href: "/attendance/daily-summary",
            permission: PERMISSIONS.ATTENDANCE_VIEW,
          },
          {
            title: "Holidays",
            href: "/attendance/holidays",
            permission: PERMISSIONS.ATTENDANCE_VIEW,
          },
          {
            title: "Locations",
            href: "/attendance/locations",
            permission: PERMISSIONS.ATTENDANCE_VIEW,
          },
        ],
      },
      {
        title: "Shifts",
        href: "/shifts",
        icon: Clock3,
        permission: PERMISSIONS.SHIFTS_VIEW,
        children: [
          {
            title: "Templates",
            href: "/shifts",
            permission: PERMISSIONS.SHIFTS_VIEW,
          },
          {
            title: "Schedules",
            href: "/shifts/schedules",
            permission: PERMISSIONS.SHIFTS_VIEW,
          },
        ],
      },
    ],
  },
  {
    label: "Field operations",
    items: [
      {
        title: "Outlets",
        href: "/outlets",
        icon: Store,
        permission: PERMISSIONS.OUTLETS_VIEW,
      },
      {
        title: "Outlet assignments",
        href: "/outlets/assignments",
        icon: MapPinned,
        permission: PERMISSIONS.OUTLETS_VIEW,
      },
      {
        title: "Visits",
        href: "/visits",
        icon: Route,
        permission: PERMISSIONS.VISITS_VIEW,
      },
      {
        title: "Expenses",
        href: "/expenses",
        icon: Wallet,
        permission: PERMISSIONS.EXPENSES_VIEW,
      },
      {
        title: "Production",
        href: "/production",
        icon: Factory,
        permission: PERMISSIONS.PRODUCTION_VIEW,
      },
      {
        title: "Inventory",
        href: "/inventory/skus",
        icon: Package,
        permission: PERMISSIONS.INVENTORY_VIEW,
        children: [
          {
            title: "SKU catalog",
            href: "/inventory/skus",
            permission: PERMISSIONS.INVENTORY_VIEW,
          },
          {
            title: "Categories",
            href: "/inventory/categories",
            permission: PERMISSIONS.INVENTORY_VIEW,
          },
        ],
      },
      {
        title: "Bookings",
        href: "/bookings",
        icon: ShoppingCart,
        permission: PERMISSIONS.BOOKINGS_VIEW,
      },
    ],
  },
  {
    label: "Data",
    items: [
      {
        title: "Import & export",
        href: "/import-export",
        icon: ArrowLeftRight,
        permission: PERMISSIONS.IMPORTS_VIEW,
      },
    ],
  },
  {
    label: "Governance",
    items: [
      {
        title: "Approvals",
        href: "/approvals/inbox",
        icon: ShieldCheck,
        permission: PERMISSIONS.APPROVALS_VIEW,
        children: [
          {
            title: "Inbox",
            href: "/approvals/inbox",
            badge: undefined,
            permission: PERMISSIONS.APPROVALS_VIEW,
          },
          {
            title: "Stages",
            href: "/approvals/stages",
            permission: PERMISSIONS.APPROVALS_MANAGE,
          },
          {
            title: "Templates",
            href: "/approvals/templates",
            permission: PERMISSIONS.APPROVALS_MANAGE,
          },
        ],
      },
      {
        title: "Reports",
        href: "/dashboard",
        icon: BarChart3,
        permission: PERMISSIONS.DASHBOARD_VIEW,
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        title: "Workspaces",
        href: "/workspaces",
        icon: Building2,
        superAdminOnly: true,
      },
      {
        title: "Create workspace",
        href: "/workspaces/new",
        icon: Building2,
        superAdminOnly: true,
      },
    ],
  },
]

function isPathActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard"
  return pathname === href || pathname.startsWith(`${href}/`)
}

function NavEntry({
  item,
  pathname,
  pendingCount,
}: {
  item: NavItem
  pathname: string
  pendingCount: number
}) {
  const childActive = item.children?.some((child) =>
    isPathActive(pathname, child.href)
  )
  const activeChild = Boolean(childActive)
  const [open, setOpen] = React.useState(activeChild)
  const [wasActive, setWasActive] = React.useState(activeChild)
  const Icon = item.icon

  if (activeChild !== wasActive) {
    setWasActive(activeChild)
    if (activeChild) setOpen(true)
  }

  if (!item.children?.length) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          render={<Link href={item.href} />}
          isActive={isPathActive(pathname, item.href)}
          tooltip={item.title}
        >
          <Icon className="size-4" />
          <span>{item.title}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="group/nav">
      <SidebarMenuItem>
        <CollapsibleTrigger
          render={
            <SidebarMenuButton isActive={activeChild} tooltip={item.title} />
          }
        >
          <Icon className="size-4" />
          <span>{item.title}</span>
          <ChevronRight className="ml-auto size-3.5 text-muted-foreground transition-transform duration-200 group-data-[panel-open]/nav:rotate-90" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children.map((child) => {
              const badge =
                child.href === "/approvals/inbox" ? pendingCount : child.badge
              return (
                <SidebarMenuSubItem key={child.href + child.title}>
                  <SidebarMenuSubButton
                    render={<Link href={child.href} />}
                    isActive={isPathActive(pathname, child.href)}
                    className="justify-between"
                  >
                    <span>{child.title}</span>
                    {badge ? (
                      <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/15 px-1 text-[0.5625rem] font-semibold text-primary">
                        {badge}
                      </span>
                    ) : null}
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              )
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}

export function AppSidebar({
  companyName,
  workspaces,
  activeWorkspaceId,
  onWorkspaceChange,
  user,
  permissions,
  pendingCount,
}: {
  companyName: string
  workspaces: { id: string; name: string; code: string | null }[]
  activeWorkspaceId: string
  onWorkspaceChange: (id: string) => void
  user: { name: string; email: string; role: string; initials: string }
  permissions: string[]
  pendingCount: number
}) {
  const pathname = usePathname()

  const visibleSections = React.useMemo(
    () =>
      navSections
        .map((section) => ({
          ...section,
          items: section.items
            .filter(
              (item) =>
                (!item.permission ||
                  hasPermission(permissions, item.permission)) &&
                (!item.superAdminOnly || user.role === "Super Admin")
            )
            .map((item) => ({
              ...item,
              children: item.children?.filter(
                (child) =>
                  !child.permission ||
                  hasPermission(permissions, child.permission)
              ),
            }))
            .filter((item) => !item.children || item.children.length > 0),
        }))
        .filter((section) => section.items.length > 0),
    [permissions, user.role]
  )

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="gap-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <Hexagon className="size-4.5 fill-current" strokeWidth={1.5} />
              </span>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate font-heading text-sm font-semibold">
                  Beekeeper
                </span>
                <span className="truncate text-[0.625rem] text-muted-foreground">
                  ERP · HR · Field Ops
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarWorkspaceSwitcher
          companyName={companyName}
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          onWorkspaceChange={onWorkspaceChange}
        />
      </SidebarHeader>

      <SidebarContent className="gap-1">
        {visibleSections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarMenu>
              {section.items.map((item) => (
                <NavEntry
                  key={item.title}
                  item={item}
                  pathname={pathname}
                  pendingCount={pendingCount}
                />
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarUser user={user} permissions={permissions} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

import Link from "next/link"
import { redirect } from "next/navigation"
import type { ElementType } from "react"
import {
  Activity,
  ArrowLeftRight,
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  Factory,
  Fingerprint,
  House,
  KeyRound,
  LayoutDashboard,
  MapPinned,
  Package,
  ShieldCheck,
  ShoppingCart,
  Store,
  Users,
  Wallet,
} from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getAccessContext } from "@/lib/auth/access"
import {
  hasPermission,
  PERMISSIONS,
  type PermissionKey,
} from "@/lib/auth/permissions"

type QuickLink = {
  title: string
  description: string
  href: string
  icon: ElementType
  permission?: PermissionKey
}

const quickLinks: QuickLink[] = [
  {
    title: "Dashboard",
    description: "Company-wide metrics and activity.",
    href: "/dashboard",
    icon: LayoutDashboard,
    permission: PERMISSIONS.DASHBOARD_VIEW,
  },
  {
    title: "Employees",
    description: "Directory, departments and positions.",
    href: "/employees",
    icon: Users,
    permission: PERMISSIONS.EMPLOYEES_VIEW,
  },
  {
    title: "Attendance",
    description: "Live check-ins, summaries and locations.",
    href: "/attendance",
    icon: Fingerprint,
    permission: PERMISSIONS.ATTENDANCE_VIEW,
  },
  {
    title: "Leave",
    description: "Requests, balances and leave types.",
    href: "/leave",
    icon: CalendarDays,
    permission: PERMISSIONS.LEAVE_VIEW,
  },
  {
    title: "Shifts",
    description: "Shift templates and schedules.",
    href: "/shifts",
    icon: Clock3,
    permission: PERMISSIONS.SHIFTS_VIEW,
  },
  {
    title: "Outlets",
    description: "Outlet directory and assignments.",
    href: "/outlets",
    icon: Store,
    permission: PERMISSIONS.OUTLETS_VIEW,
  },
  {
    title: "Visits",
    description: "Visit plans, logs and field check-ins.",
    href: "/visits",
    icon: MapPinned,
    permission: PERMISSIONS.VISITS_VIEW,
  },
  {
    title: "Production",
    description: "Pipelines, stages and SKU usage.",
    href: "/production",
    icon: Factory,
    permission: PERMISSIONS.PRODUCTION_VIEW,
  },
  {
    title: "Expenses",
    description: "Expense items, plans and categories.",
    href: "/expenses",
    icon: Wallet,
    permission: PERMISSIONS.EXPENSES_VIEW,
  },
  {
    title: "Inventory",
    description: "SKU catalog and categories.",
    href: "/inventory/skus",
    icon: Package,
    permission: PERMISSIONS.INVENTORY_VIEW,
  },
  {
    title: "Bookings",
    description: "Field bookings and order register.",
    href: "/bookings",
    icon: ShoppingCart,
    permission: PERMISSIONS.BOOKINGS_VIEW,
  },
  {
    title: "Approvals",
    description: "Review queue and approval history.",
    href: "/approvals/inbox",
    icon: ShieldCheck,
    permission: PERMISSIONS.APPROVALS_VIEW,
  },
  {
    title: "Import & export",
    description: "Move data in and out of the workspace.",
    href: "/import-export",
    icon: ArrowLeftRight,
    permission: PERMISSIONS.IMPORTS_VIEW,
  },
  {
    title: "Activity feed",
    description: "Recent changes across the workspace.",
    href: "/feed",
    icon: Activity,
    permission: PERMISSIONS.FEED_VIEW,
  },
]

function ChecklistItem({
  done,
  label,
  hint,
}: {
  done: boolean
  label: string
  hint: string
}) {
  return (
    <li className="flex items-start gap-2.5">
      {done ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" />
      )}
      <span className="min-w-0">
        <span className="block text-xs font-medium">{label}</span>
        <span className="block text-[0.6875rem] text-muted-foreground">
          {hint}
        </span>
      </span>
    </li>
  )
}

export default async function HomePage() {
  const access = await getAccessContext()

  if (!access.user) {
    redirect("/login")
  }

  const user = access.user
  const firstName = user.name.split(" ")[0] || "there"
  const hasCompany = Boolean(access.companyId)
  const hasRole = Boolean(user.roleId)
  const hasPermissions = access.permissions.length > 0
  const availableLinks = quickLinks.filter(
    (link) =>
      !link.permission || hasPermission(access.permissions, link.permission)
  )
  const workspace = access.workspaces[0]

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={access.company?.name ?? "Beekeeper"}
        title={`Welcome back, ${firstName}`}
        description="This is your home base. Jump into any module your role can access, or review what is still pending on your account."
        icon={House}
      />

      {!hasCompany && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader className="border-b border-amber-500/20 pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Building2 className="size-4 text-amber-600 dark:text-amber-400" />
              Your workspace is not ready yet
            </CardTitle>
            <CardDescription>
              You are signed in as{" "}
              <span className="font-medium text-foreground">{user.email}</span>,
              but your account is not linked to a company. A company
              administrator needs to add you to a company and assign a role
              before modules become available.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
              Once your membership is configured, refresh this page. In the
              meantime you can still use this home page and sign out from the
              user menu.
            </p>
          </CardContent>
        </Card>
      )}

      {hasCompany && !hasPermissions && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader className="border-b border-amber-500/20 pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <KeyRound className="size-4 text-amber-600 dark:text-amber-400" />
              No module access yet
            </CardTitle>
            <CardDescription>
              Your account is connected to{" "}
              <span className="font-medium text-foreground">
                {access.company?.name ?? "your company"}
              </span>
              , but the{" "}
              <span className="font-medium text-foreground">{user.role}</span>{" "}
              role does not have any module permissions. Ask an administrator to
              grant the permissions you need.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
              This page is always available, even without permissions, so you
              can still see your account status and sign out.
            </p>
          </CardContent>
        </Card>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-heading text-sm font-semibold">
              Your workspace
            </h2>
            <p className="text-[0.6875rem] text-muted-foreground">
              {availableLinks.length === 0
                ? "No modules are available for your role yet."
                : `${availableLinks.length} module${availableLinks.length === 1 ? "" : "s"} available for your role.`}
            </p>
          </div>
          <Badge variant="secondary" className="text-[0.625rem]">
            {user.role}
          </Badge>
        </div>

        {availableLinks.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-start gap-3 py-6">
              <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <House className="size-5" />
              </span>
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  Nothing has been assigned to you yet
                </p>
                <p className="max-w-xl text-xs text-muted-foreground">
                  You will see quick links here as soon as your role has
                  permissions. You can keep this page open and refresh after an
                  administrator updates your access.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {availableLinks.map((link) => {
              const Icon = link.icon
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group rounded-xl border bg-card p-4 transition-colors hover:border-primary/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </span>
                    <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <p className="mt-3 text-sm font-semibold">{link.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {link.description}
                  </p>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-sm">Your access</CardTitle>
            <CardDescription>
              Where you sit in the workspace and what is still pending.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-[0.625rem] font-semibold tracking-wider text-muted-foreground uppercase">
                  Signed in as
                </dt>
                <dd className="mt-1 truncate text-xs font-medium">
                  {user.name}
                </dd>
                <dd className="truncate text-[0.6875rem] text-muted-foreground">
                  {user.email}
                </dd>
              </div>
              <div>
                <dt className="text-[0.625rem] font-semibold tracking-wider text-muted-foreground uppercase">
                  Role
                </dt>
                <dd className="mt-1 text-xs font-medium">{user.role}</dd>
                <dd className="text-[0.6875rem] text-muted-foreground">
                  {access.permissions.length} permission
                  {access.permissions.length === 1 ? "" : "s"} granted
                </dd>
              </div>
              <div>
                <dt className="text-[0.625rem] font-semibold tracking-wider text-muted-foreground uppercase">
                  Company
                </dt>
                <dd className="mt-1 truncate text-xs font-medium">
                  {access.company?.name ?? "Not linked yet"}
                </dd>
              </div>
              <div>
                <dt className="text-[0.625rem] font-semibold tracking-wider text-muted-foreground uppercase">
                  Workspace
                </dt>
                <dd className="mt-1 truncate text-xs font-medium">
                  {workspace?.name ?? "No workspace assigned"}
                </dd>
              </div>
            </dl>

            <ul className="space-y-2.5 border-t pt-3">
              <ChecklistItem
                done
                label="Signed in"
                hint="Your account is authenticated."
              />
              <ChecklistItem
                done={hasCompany}
                label="Company membership"
                hint={
                  hasCompany
                    ? "Your account belongs to a company."
                    : "Ask an administrator to add you to a company."
                }
              />
              <ChecklistItem
                done={hasRole}
                label="Role assigned"
                hint={
                  hasRole
                    ? `You are using the ${user.role} role.`
                    : "A role is needed before permissions can be granted."
                }
              />
              <ChecklistItem
                done={hasPermissions}
                label="Module permissions"
                hint={
                  hasPermissions
                    ? "You can open the modules listed above."
                    : "Ask an administrator to grant module permissions."
                }
              />
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ShieldCheck className="size-4 text-primary" />
              Need more access?
            </CardTitle>
            <CardDescription>
              Permissions are managed by your company administrator.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <p className="text-xs/relaxed text-muted-foreground">
              Ask an administrator to review your role in the workspace. Role
              permissions decide which modules and actions appear in the
              sidebar and on this page.
            </p>
            <p className="rounded-md border bg-muted/30 px-2.5 py-2 text-[0.6875rem] text-muted-foreground">
              Include your email address when contacting them so they can find
              your membership quickly.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

import Link from "next/link"
import { redirect } from "next/navigation"
import type { ElementType } from "react"
import {
  Activity,
  ArrowLeftRight,
  ArrowRight,
  Building2,
  CalendarDays,
  Clock3,
  Factory,
  Fingerprint,
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

import {
  AsciiBee,
  AsciiCell,
  AsciiComb,
  SectionRule,
} from "@/components/shared/ascii-art"
import { Badge } from "@/components/ui/badge"
import { getAccessContext } from "@/lib/auth/access"
import {
  hasPermission,
  PERMISSIONS,
  type PermissionKey,
} from "@/lib/auth/permissions"
import { cn } from "@/lib/utils"

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

function Notice({
  icon: Icon,
  label,
  title,
  children,
}: {
  icon: ElementType
  label: string
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="relative overflow-hidden border border-primary/30 bg-primary/[0.035] p-4 sm:p-5">
      <AsciiComb className="absolute -right-8 -bottom-8 text-primary/10" />
      <div className="relative flex items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center border border-primary/30 bg-primary/10 text-primary">
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 space-y-1.5">
          <p className="micro-label text-primary">{label}</p>
          <p className="font-heading text-xl leading-tight">{title}</p>
          <div className="max-w-3xl text-xs/relaxed text-muted-foreground">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

function SpecRow({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="flex items-baseline gap-3 border-b border-border/60 py-2 last:border-0">
      <span className="micro-label shrink-0">{label}</span>
      <span
        className="h-px flex-1 border-b border-dotted border-border"
        aria-hidden
      />
      <span className="text-right">
        <span className="block text-xs font-medium">{value}</span>
        {hint ? (
          <span className="block text-[0.625rem] text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </span>
    </div>
  )
}

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
      <span
        className={cn(
          "mt-px font-mono text-[0.625rem] leading-none",
          done ? "text-primary" : "text-muted-foreground/40"
        )}
        aria-hidden
      >
        {done ? "[x]" : "[ ]"}
      </span>
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

  // Fill the final grid row so the hairline background never shows through as
  // an empty gray cell. Two-column and three-column layouts need different
  // counts, so each filler is revealed per breakpoint.
  const threeColumnFillers = (3 - (availableLinks.length % 3)) % 3
  const twoColumnFillers = (2 - (availableLinks.length % 2)) % 2
  const gridFillers = Array.from(
    { length: Math.max(threeColumnFillers, twoColumnFillers) },
    (_, index) => ({
      key: `filler-${index}`,
      visible: cn(
        "hidden",
        index < twoColumnFillers && "sm:flex",
        index >= twoColumnFillers && index < threeColumnFillers
          ? "xl:flex"
          : index < threeColumnFillers
            ? ""
            : "xl:hidden"
      ),
    })
  )

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden border border-border bg-card">
        <div className="field-grid absolute inset-0 opacity-25" aria-hidden />
        <div
          className="absolute -top-24 -right-24 size-72 bg-primary/10 blur-3xl"
          aria-hidden
        />

        <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.45fr_1fr]">
          <div className="space-y-4">
            <p className="micro-label flex items-center gap-2">
              <span className="h-px w-5 bg-primary" aria-hidden />
              00 // The hive
            </p>
            <h1 className="font-heading text-4xl leading-[0.95] tracking-tight text-balance sm:text-5xl">
              Welcome back, {firstName}.
            </h1>
            <p className="font-heading text-base text-primary">
              蜂と蜜のために
            </p>
            <p className="max-w-xl text-xs/relaxed text-muted-foreground">
              This is your home base. Jump into any module your role can access,
              or review what is still pending on your account.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge
                variant="outline"
                className="border-primary/40 text-primary"
              >
                {user.role}
              </Badge>
              <Badge variant="outline">
                {access.company?.name ?? "No company linked"}
              </Badge>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-4 border-t border-border pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
            <div className="flex items-start justify-between gap-3">
              <AsciiBee className="text-[0.7rem] text-primary" />
              <AsciiComb className="text-[0.5rem] text-muted-foreground/25" />
            </div>
            <dl className="space-y-1.5 font-mono text-[0.5625rem] tracking-[0.14em] uppercase">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground/60">workspace</dt>
                <dd className="truncate">{workspace?.name ?? "unassigned"}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground/60">permissions</dt>
                <dd className="tabular-nums">
                  {String(access.permissions.length).padStart(2, "0")}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground/60">status</dt>
                <dd className={hasPermissions ? "text-primary" : ""}>
                  {hasPermissions ? "active" : "pending"}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {!hasCompany && (
        <Notice
          icon={Building2}
          label="Account // 01"
          title="Your workspace is not ready yet"
        >
          <p>
            You are signed in as{" "}
            <span className="font-medium text-foreground">{user.email}</span>,
            but your account is not linked to a company. A company
            administrator needs to add you to a company and assign a role before
            modules become available.
          </p>
          <p className="mt-1.5">
            Once your membership is configured, refresh this page. In the
            meantime you can still use this home page and sign out from the user
            menu.
          </p>
        </Notice>
      )}

      {hasCompany && !hasPermissions && (
        <Notice
          icon={KeyRound}
          label="Access // 02"
          title="No module access yet"
        >
          <p>
            Your account is connected to{" "}
            <span className="font-medium text-foreground">
              {access.company?.name ?? "your company"}
            </span>
            , but the{" "}
            <span className="font-medium text-foreground">{user.role}</span> role
            does not have any module permissions. Ask an administrator to grant
            the permissions you need.
          </p>
          <p className="mt-1.5">
            This page is always available, even without permissions, so you can
            still see your account status and sign out.
          </p>
        </Notice>
      )}

      <section className="space-y-3">
        <SectionRule
          index="01"
          label="Modules"
          trailing={`${String(availableLinks.length).padStart(2, "0")} available`}
        />

        {availableLinks.length === 0 ? (
          <div className="relative overflow-hidden border border-border bg-card p-6">
            <AsciiComb className="absolute right-4 bottom-4 text-muted-foreground/10" />
            <p className="micro-label text-primary">Standby</p>
            <p className="mt-2 font-heading text-2xl">
              Nothing has been assigned to you yet.
            </p>
            <p className="mt-2 max-w-xl text-xs text-muted-foreground">
              You will see quick links here as soon as your role has
              permissions. Keep this page open and refresh after an
              administrator updates your access.
            </p>
          </div>
        ) : (
          <div className="grid gap-px border border-border bg-border sm:grid-cols-2 xl:grid-cols-3">
            {availableLinks.map((link, index) => {
              const Icon = link.icon
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group relative bg-card p-4 transition-colors hover:bg-accent/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-[0.5625rem] tracking-[0.16em] text-muted-foreground/50 tabular-nums">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <Icon className="size-4 text-primary" aria-hidden />
                  </div>
                  <p className="mt-5 font-heading text-lg leading-none">
                    {link.title}
                  </p>
                  <p className="mt-2 pr-6 text-[0.6875rem] text-muted-foreground">
                    {link.description}
                  </p>
                  <ArrowRight
                    className="absolute right-4 bottom-4 size-3.5 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                    aria-hidden
                  />
                </Link>
              )
            })}
            {gridFillers.map((filler) => (
              <div
                key={filler.key}
                aria-hidden
                className={cn(
                  "relative items-center justify-center bg-card p-4",
                  filler.visible
                )}
              >
                <span className="font-mono text-[0.5625rem] tracking-[0.16em] text-muted-foreground/40 uppercase">
                  spare comb
                </span>
                <AsciiCell className="mt-3 text-[0.5rem] text-muted-foreground/15" />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <SectionRule
          index="02"
          label="Access"
          trailing={`${access.permissions.length} granted`}
        />
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="border border-border bg-card p-5 lg:col-span-2">
            <p className="micro-label text-primary">Identity // hive record</p>
            <div className="mt-3">
              <SpecRow
                label="Signed in"
                value={user.name}
                hint={user.email}
              />
              <SpecRow
                label="Role"
                value={user.role}
                hint={`${access.permissions.length} permission${
                  access.permissions.length === 1 ? "" : "s"
                } granted`}
              />
              <SpecRow
                label="Company"
                value={access.company?.name ?? "Not linked yet"}
              />
              <SpecRow
                label="Workspace"
                value={workspace?.name ?? "No workspace assigned"}
              />
            </div>

            <ul className="mt-4 grid gap-2 border-t border-border pt-4 sm:grid-cols-2">
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
          </div>

          <div className="relative overflow-hidden border border-border bg-card p-5">
            <AsciiComb className="absolute -right-8 -bottom-8 text-muted-foreground/10" />
            <p className="micro-label text-primary">Support // 03</p>
            <p className="mt-2 font-heading text-2xl">Need more access?</p>
            <p className="mt-2 text-xs/relaxed text-muted-foreground">
              Ask an administrator to review your role in the workspace. Role
              permissions decide which modules and actions appear in the
              sidebar and on this page.
            </p>
            <p className="mt-3 border border-border bg-muted/30 px-2.5 py-2 text-[0.6875rem] text-muted-foreground">
              Include your email address when contacting them so they can find
              your membership quickly.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

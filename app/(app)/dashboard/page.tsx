import Link from "next/link"
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  MapPin,
  Package,
  ShoppingCart,
  Store,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react"

import { MetricCard } from "@/components/shared/metric-card"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  getAttendanceDaily,
  getBookings,
  getEmployees,
  getLeaveRequests,
  getOutlets,
  getPendingApprovals,
  getWorkspaceContext,
} from "@/lib/data/queries"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import {
  formatCurrency,
  formatDate,
  formatRelative,
  getInitials,
  humanize,
  percent,
} from "@/lib/format"
import type {
  BookingStatus,
  MyPendingApproval,
  OutletStatus,
} from "@/types/database"

const bookingStatusOrder: BookingStatus[] = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
]

const outletStatusOrder: OutletStatus[] = [
  "ACTIVE",
  "PENDING",
  "INACTIVE",
  "SUSPENDED",
  "REJECTED",
]

const documentIcon: Record<MyPendingApproval["document_type"], typeof Package> =
  {
    BOOKING: ShoppingCart,
    OUTLET: Store,
  }

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

export default async function DashboardPage() {
  await requirePermission(PERMISSIONS.DASHBOARD_VIEW)

  const [
    employeesResult,
    attendanceResult,
    approvalsResult,
    bookingsResult,
    outletsResult,
    leaveResult,
    contextResult,
  ] = await Promise.all([
    getEmployees(),
    getAttendanceDaily(),
    getPendingApprovals(),
    getBookings(),
    getOutlets(),
    getLeaveRequests(),
    getWorkspaceContext(),
  ])

  const employees = employeesResult.data
  const attendance = attendanceResult.data
  const approvals = approvalsResult.data
  const bookings = bookingsResult.data
  const outlets = outletsResult.data
  const leaveRequests = leaveResult.data
  const context = contextResult.data

  const activeHeadcount = employees.filter((employee) =>
    ["ACTIVE", "PROBATION", "ON_LEAVE"].includes(employee.status)
  ).length
  const presentToday = attendance.filter((row) =>
    ["PRESENT", "LATE", "REMOTE", "HALF_DAY"].includes(row.status)
  ).length
  const lateToday = attendance.filter((row) => row.status === "LATE").length
  const onLeaveToday = attendance.filter(
    (row) => row.status === "ON_LEAVE"
  ).length
  const absentToday = attendance.filter((row) => row.status === "ABSENT").length
  const pendingLeave = leaveRequests.filter(
    (request) => request.status === "PENDING"
  ).length
  const pendingBookings = bookings.filter((booking) =>
    ["DRAFT", "PENDING_APPROVAL"].includes(booking.status)
  ).length
  const activeOutlets = outlets.filter(
    (outlet) => outlet.status === "ACTIVE"
  ).length
  const pendingOutlets = outlets.filter(
    (outlet) => outlet.status === "PENDING"
  ).length

  const bookingCounts = bookingStatusOrder.map((status) => ({
    status,
    count: bookings.filter((booking) => booking.status === status).length,
  }))

  const outletCounts = outletStatusOrder.map((status) => ({
    status,
    count: outlets.filter((outlet) => outlet.status === status).length,
  }))

  const upcomingLeave = leaveRequests
    .filter((request) => request.status === "APPROVED")
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .slice(0, 4)

  const latestBookings = [...bookings]
    .sort((a, b) => b.booking_date.localeCompare(a.booking_date))
    .slice(0, 5)

  const attendanceRate = percent(presentToday, attendance.length)
  const firstName =
    context.user.name && context.user.name !== "Workspace user"
      ? context.user.name.split(" ")[0]
      : null

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={formatDate(new Date(), {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
        title={firstName ? `${greeting()}, ${firstName}` : greeting()}
        description={`Here is what needs your attention across ${context.company?.name ?? "your operations"} today.`}
        icon={TrendingUp}
        actions={
          <>
            <Button variant="outline" render={<Link href="/approvals/inbox" />}>
              <ClipboardCheck />
              Review approvals
              {approvals.length > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-4 px-1 text-[0.5625rem]"
                >
                  {approvals.length}
                </Badge>
              )}
            </Button>
            <Button render={<Link href="/employees/new" />}>
              <UserPlus />
              Onboard employee
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Active headcount"
          value={activeHeadcount}
          hint={`${employees.length} total employee records`}
          icon={Users}
          accent="primary"
        />
        <MetricCard
          label="Present today"
          value={`${presentToday}/${attendance.length}`}
          hint={`${attendanceRate}% attendance rate`}
          icon={CheckCircle2}
          accent="emerald"
        />
        <MetricCard
          label="Late arrivals"
          value={lateToday}
          hint={`${absentToday} absent · ${onLeaveToday} on leave`}
          icon={Clock3}
          accent="amber"
        />
        <MetricCard
          label="Pending approvals"
          value={approvals.length}
          hint={`${pendingLeave} leave requests need review`}
          icon={ClipboardCheck}
          accent="violet"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="border-b pb-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle>Approval inbox</CardTitle>
                <CardDescription>
                  Documents routed to you across bookings, outlets and leave.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                render={<Link href="/approvals/inbox" />}
              >
                View all
                <ArrowRight />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {approvals.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <CheckCircle2 className="size-6 text-emerald-500" />
                <p className="text-xs font-medium">You are all caught up</p>
                <p className="text-[0.6875rem] text-muted-foreground">
                  New documents will appear here as they are routed to you.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {approvals.slice(0, 5).map((approval) => {
                  const Icon = documentIcon[approval.document_type]
                  return (
                    <Link
                      key={approval.request_stage_id}
                      href="/approvals/inbox"
                      className="flex items-center gap-3 py-2.5 transition-colors first:pt-1 last:pb-1 hover:bg-muted/40"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">
                          {approval.title}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[0.625rem] text-muted-foreground">
                          <span>{approval.document_no}</span>
                          <span>·</span>
                          <span>{approval.requested_by_name}</span>
                          <span>·</span>
                          <span>{approval.stage_name}</span>
                        </p>
                      </div>
                      <div className="hidden shrink-0 text-right sm:block">
                        {approval.amount > 0 && (
                          <p className="text-[0.6875rem] font-medium tabular-nums">
                            {formatCurrency(approval.amount, true)}
                          </p>
                        )}
                        <p className="text-[0.625rem] text-muted-foreground">
                          {formatRelative(approval.submitted_at)}
                        </p>
                      </div>
                      <StatusBadge
                        status={approval.status}
                        className="shrink-0"
                      />
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b pb-3">
            <CardTitle>Attendance today</CardTitle>
            <CardDescription>
              Live snapshot across all locations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-medium">Attendance rate</span>
                <span className="font-heading text-lg font-semibold tabular-nums">
                  {attendanceRate}%
                </span>
              </div>
              <Progress value={attendanceRate} />
              <p className="text-[0.625rem] text-muted-foreground">
                {presentToday} of {attendance.length} employees clocked in
              </p>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: "Present",
                  value: presentToday - lateToday,
                  tone: "text-emerald-600",
                },
                { label: "Late", value: lateToday, tone: "text-amber-600" },
                {
                  label: "On leave",
                  value: onLeaveToday,
                  tone: "text-sky-600",
                },
                { label: "Absent", value: absentToday, tone: "text-rose-600" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-md border bg-muted/20 px-2.5 py-2"
                >
                  <p className="text-[0.625rem] text-muted-foreground">
                    {item.label}
                  </p>
                  <p
                    className={`font-heading text-base font-semibold tabular-nums ${item.tone}`}
                  >
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              render={<Link href="/attendance" />}
            >
              Open live feed
              <ArrowRight />
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="border-b pb-3">
            <CardTitle>Booking pipeline</CardTitle>
            <CardDescription>
              {pendingBookings} bookings awaiting action.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-0">
            {bookingCounts.map((item) => (
              <div key={item.status} className="flex items-center gap-2">
                <StatusBadge
                  status={item.status}
                  className="w-32 justify-start"
                />
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/70"
                    style={{
                      width: `${percent(item.count, bookings.length)}%`,
                    }}
                  />
                </div>
                <span className="w-5 text-right text-[0.6875rem] font-medium tabular-nums">
                  {item.count}
                </span>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="mt-1 w-full"
              render={<Link href="/bookings" />}
            >
              Open bookings
              <ArrowRight />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b pb-3">
            <CardTitle>Outlet coverage</CardTitle>
            <CardDescription>
              {activeOutlets} active · {pendingOutlets} pending onboarding.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-0">
            {outletCounts.map((item) => (
              <div key={item.status} className="flex items-center gap-2">
                <StatusBadge
                  status={item.status}
                  className="w-32 justify-start"
                />
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-emerald-500/70"
                    style={{ width: `${percent(item.count, outlets.length)}%` }}
                  />
                </div>
                <span className="w-5 text-right text-[0.6875rem] font-medium tabular-nums">
                  {item.count}
                </span>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="mt-1 w-full"
              render={<Link href="/outlets" />}
            >
              Open outlets
              <ArrowRight />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b pb-3">
            <CardTitle>Upcoming leave</CardTitle>
            <CardDescription>
              Approved absences in the next weeks.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {upcomingLeave.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                No approved leave scheduled.
              </p>
            ) : (
              <div className="divide-y">
                {upcomingLeave.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center gap-2.5 py-2.5 first:pt-1 last:pb-1"
                  >
                    <Avatar className="size-7">
                      <AvatarFallback className="bg-primary/10 text-[0.5625rem] font-semibold text-primary">
                        {getInitials(
                          `${request.employee.first_name} ${request.employee.last_name}`
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">
                        {request.employee.first_name}{" "}
                        {request.employee.last_name}
                      </p>
                      <p className="text-[0.625rem] text-muted-foreground">
                        {humanize(request.leave_type.code)} ·{" "}
                        {request.days_count}{" "}
                        {request.days_count === 1 ? "day" : "days"}
                      </p>
                    </div>
                    <span className="text-[0.625rem] text-muted-foreground">
                      {formatDate(request.start_date, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b pb-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle>Latest field bookings</CardTitle>
              <CardDescription>
                Most recent orders captured by field representatives.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/bookings" />}
            >
              All bookings
              <ArrowRight />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="divide-y">
            {latestBookings.map((booking) => (
              <Link
                key={booking.id}
                href={`/bookings/${booking.id}`}
                className="flex items-center gap-3 py-2.5 transition-colors first:pt-1 last:pb-1 hover:bg-muted/40"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <ShoppingCart className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">
                    {booking.outlet.name}
                  </p>
                  <p className="flex items-center gap-1 text-[0.625rem] text-muted-foreground">
                    <MapPin className="size-2.5" />
                    {booking.outlet.address ?? booking.outlet.code} ·{" "}
                    {booking.booking_no}
                  </p>
                </div>
                <div className="hidden text-right sm:block">
                  <p className="text-[0.6875rem] font-medium tabular-nums">
                    {formatCurrency(booking.total)}
                  </p>
                  <p className="text-[0.625rem] text-muted-foreground">
                    {booking.line_count} line
                    {booking.line_count === 1 ? "" : "s"}
                  </p>
                </div>
                <StatusBadge status={booking.status} className="shrink-0" />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

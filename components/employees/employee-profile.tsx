"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Banknote,
  BriefcaseBusiness,
  Download,
  FileText,
  IdCard,
  Mail,
  MapPin,
  MessageSquare,
  Pencil,
  Phone,
  Trash2,
  UserRound,
} from "lucide-react"

import { deleteEmployeeDocument, getEmployeeDocumentUrl, uploadEmployeeDocument } from "@/actions/employee-document.action"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StatusBadge } from "@/components/shared/status-badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/toast"
import {
  formatCurrency,
  formatDate,
  formatTime,
  getInitials,
  humanize,
  percent,
} from "@/lib/format"
import type {
  AttendanceWithEmployee,
  EmployeeDocument,
  EmployeeWithRelations,
  LeaveBalanceWithRelations,
  LeaveRequestWithRelations,
} from "@/types/database"

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="text-[0.6875rem] text-muted-foreground">{label}</span>
      <span className="text-right text-xs font-medium">{value || "—"}</span>
    </div>
  )
}

export function EmployeeProfile({
  employee,
  documents,
  attendance,
  leaveRequests,
  leaveBalances,
}: {
  employee: EmployeeWithRelations
  documents: EmployeeDocument[]
  attendance: AttendanceWithEmployee[]
  leaveRequests: LeaveRequestWithRelations[]
  leaveBalances: LeaveBalanceWithRelations[]
}) {
  const router = useRouter()
  const [uploading, setUploading] = React.useState(false)
  const fullName = `${employee.first_name} ${employee.middle_name ? `${employee.middle_name} ` : ""}${employee.last_name}`
  const employeeAttendance = attendance
    .filter((row) => row.employee_id === employee.id)
    .sort((a, b) => b.clock_in_at.localeCompare(a.clock_in_at))
  const employeeLeave = leaveRequests
    .filter((request) => request.employee_id === employee.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
  const balances = leaveBalances.filter(
    (balance) => balance.employee_id === employee.id
  )
  const totalEntitlement = balances.reduce(
    (sum, balance) => sum + balance.entitlement_days,
    0
  )
  const totalUsed = balances.reduce((sum, balance) => sum + balance.used_days, 0)
  const tenureDays = employee.hire_date
    ? Math.max(
        0,
        Math.round(
          (Date.now() - new Date(employee.hire_date).getTime()) / 86_400_000
        )
      )
    : 0
  const tenureYears = Math.floor(tenureDays / 365)
  const tenureMonths = Math.floor((tenureDays % 365) / 30)
  const presentCount = employeeAttendance.filter((row) => row.clock_out_at).length
  const attendanceRate = percent(presentCount, employeeAttendance.length)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" render={<Link href="/employees" />}>
          <ArrowLeft />
          Employee directory
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <Avatar className="size-14 shrink-0">
            <AvatarFallback className="bg-primary/10 font-heading text-lg font-semibold text-primary">
              {getInitials(fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-lg font-semibold tracking-tight">
                {fullName}
              </h1>
              <StatusBadge status={employee.status} />
              <Badge variant="outline">{humanize(employee.employment_type)}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {employee.position?.title ?? "Unassigned position"} ·{" "}
              {employee.department?.name ?? "No department"}
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-[0.6875rem] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <IdCard className="size-3" />
                {employee.employee_no}
              </span>
              <span className="inline-flex items-center gap-1">
                <Mail className="size-3" />
                {employee.email}
              </span>
              <span className="inline-flex items-center gap-1">
                <Phone className="size-3" />
                {employee.phone ?? "—"}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" />
                {employee.address ?? "—"}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button variant="outline" size="sm">
              <MessageSquare />
              Message
            </Button>
            <Button size="sm">
              <Pencil />
              Edit profile
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="gap-0 py-4">
          <CardContent className="space-y-1">
            <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
              Tenure
            </p>
            <p className="font-heading text-lg font-semibold">
              {tenureYears > 0 ? `${tenureYears}y ` : ""}
              {tenureMonths}m
            </p>
            <p className="text-[0.6875rem] text-muted-foreground">
              Hired {formatDate(employee.hire_date)}
            </p>
          </CardContent>
        </Card>
        <Card className="gap-0 py-4">
          <CardContent className="space-y-1">
            <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
              Attendance
            </p>
            <p className="font-heading text-lg font-semibold">{attendanceRate}%</p>
            <p className="text-[0.6875rem] text-muted-foreground">
              {presentCount} of {employeeAttendance.length} shifts
            </p>
          </CardContent>
        </Card>
        <Card className="gap-0 py-4">
          <CardContent className="space-y-1">
            <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
              Leave balance
            </p>
            <p className="font-heading text-lg font-semibold">
              {Math.max(0, totalEntitlement - totalUsed).toFixed(1)} days
            </p>
            <p className="text-[0.6875rem] text-muted-foreground">
              {totalUsed.toFixed(1)} used of {totalEntitlement.toFixed(1)}
            </p>
          </CardContent>
        </Card>
        <Card className="gap-0 py-4">
          <CardContent className="space-y-1">
            <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
              Base salary
            </p>
            <p className="font-heading text-lg font-semibold">
              {formatCurrency(employee.base_salary ?? 0, true)}
            </p>
            <p className="text-[0.6875rem] text-muted-foreground">
              {humanize(employee.pay_frequency)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="gap-3">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="leave">Leave</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="border-b pb-3">
                <CardTitle className="flex items-center gap-2">
                  <UserRound className="size-3.5 text-muted-foreground" />
                  Personal information
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <InfoRow label="Full name" value={fullName} />
                <InfoRow label="Date of birth" value={formatDate(employee.birth_date)} />
                <InfoRow label="Gender" value={humanize(employee.gender)} />
                <InfoRow label="Civil status" value={employee.civil_status} />
                <InfoRow label="Address" value={employee.address} />
                <Separator className="my-2" />
                <InfoRow
                  label="Emergency contact"
                  value={employee.emergency_contact_name}
                />
                <InfoRow
                  label="Emergency phone"
                  value={employee.emergency_contact_phone}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b pb-3">
                <CardTitle className="flex items-center gap-2">
                  <BriefcaseBusiness className="size-3.5 text-muted-foreground" />
                  Employment
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <InfoRow label="Department" value={employee.department?.name} />
                <InfoRow label="Position" value={employee.position?.title} />
                <InfoRow
                  label="Manager"
                  value={
                    employee.manager
                      ? `${employee.manager.first_name} ${employee.manager.last_name}`
                      : "None"
                  }
                />
                <InfoRow label="Employment type" value={humanize(employee.employment_type)} />
                <InfoRow label="Date hired" value={formatDate(employee.hire_date)} />
                <InfoRow
                  label="Regularized"
                  value={formatDate(employee.regularization_date)}
                />
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="border-b pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Banknote className="size-3.5 text-muted-foreground" />
                  Compensation &amp; payroll
                </CardTitle>
                <CardDescription>
                  Sensitive information is visible to Finance and People &amp; Culture only.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-x-8 gap-y-1 pt-0 sm:grid-cols-2">
                <InfoRow label="Base salary" value={formatCurrency(employee.base_salary ?? 0)} />
                <InfoRow label="Pay frequency" value={humanize(employee.pay_frequency)} />
                <InfoRow label="Employment status" value={humanize(employee.status)} />
                <InfoRow label="Separation date" value={formatDate(employee.separation_date)} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardHeader className="border-b pb-3">
              <CardTitle>Recent attendance</CardTitle>
              <CardDescription>
                Clock-ins, geofence validation and shift adherence.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Clock in</TableHead>
                    <TableHead>Clock out</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Geofence</TableHead>
                    <TableHead>Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeeAttendance.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-xs text-muted-foreground">
                        No attendance records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    employeeAttendance.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="text-xs">
                          {formatDate(row.clock_in_at)}
                        </TableCell>
                        <TableCell className="text-xs">{formatTime(row.clock_in_at)}</TableCell>
                        <TableCell className="text-xs">
                          {row.clock_out_at ? formatTime(row.clock_out_at) : "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.location?.name ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs">{row.shift?.name ?? "—"}</TableCell>
                        <TableCell>
                          <StatusBadge
                            status={row.within_geofence ? "WITHIN_GEOFENCE" : "OUTSIDE_GEOFENCE"}
                            label={`${row.distance_m}m`}
                            tone={row.within_geofence ? "success" : "danger"}
                          />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {humanize(row.source)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leave">
          <div className="space-y-4">
            <Card>
              <CardHeader className="border-b pb-3">
                <CardTitle>Leave balances</CardTitle>
                <CardDescription>
                  Current year entitlement, usage and pending requests.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 pt-0 sm:grid-cols-2 lg:grid-cols-3">
                {balances.length === 0 ? (
                  <p className="py-4 text-xs text-muted-foreground">
                    No leave balances configured.
                  </p>
                ) : (
                  balances.map((balance) => {
                    const available =
                      balance.entitlement_days +
                      balance.carried_over_days -
                      balance.used_days -
                      balance.pending_days
                    return (
                      <div key={balance.id} className="space-y-1.5 rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium">
                            {balance.leave_type.name}
                          </span>
                          <span className="text-[0.625rem] text-muted-foreground">
                            {balance.year}
                          </span>
                        </div>
                        <Progress
                          value={percent(balance.used_days, balance.entitlement_days)}
                        />
                        <div className="flex items-center justify-between text-[0.625rem] text-muted-foreground">
                          <span>{balance.used_days} used</span>
                          <span>{available.toFixed(1)} available</span>
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b pb-3">
                <CardTitle>Leave history</CardTitle>
                <CardDescription>Requests submitted by this employee.</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employeeLeave.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
                          No leave requests found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      employeeLeave.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="text-xs">{request.leave_type.name}</TableCell>
                          <TableCell className="text-xs">
                            {formatDate(request.start_date, { month: "short", day: "numeric" })} –{" "}
                            {formatDate(request.end_date, { month: "short", day: "numeric" })}
                          </TableCell>
                          <TableCell className="text-xs">{request.days_count}</TableCell>
                          <TableCell className="max-w-64 truncate text-xs text-muted-foreground">
                            {request.reason}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={request.status} />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader className="border-b pb-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle>Employee documents</CardTitle>
                  <CardDescription>
                    Contracts, government IDs and compliance records.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <form
                onSubmit={async (event) => {
                  event.preventDefault()
                  const form = event.currentTarget
                  const formData = new FormData(form)
                  formData.set("employeeId", employee.id)
                  setUploading(true)
                  const result = await uploadEmployeeDocument(formData)
                  setUploading(false)
                  if (!result.success) {
                    toast.add({ type: "error", title: "Upload failed", description: result.error })
                    return
                  }
                  toast.add({ type: "success", title: "Document uploaded" })
                  form.reset()
                  router.refresh()
                }}
                className="mb-4 grid gap-2 sm:grid-cols-4"
              >
                <Input name="name" placeholder="Document name" required className="sm:col-span-1" />
                <Input name="category" placeholder="Category" className="sm:col-span-1" />
                <Input name="expiresOn" type="date" className="sm:col-span-1" />
                <div className="flex items-center gap-2 sm:col-span-1">
                  <Input name="file" type="file" required className="h-8" />
                  <Button type="submit" size="sm" disabled={uploading}>
                    {uploading ? "Uploading…" : "Upload"}
                  </Button>
                </div>
              </form>
              {documents.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <FileText className="size-6 text-muted-foreground" />
                  <p className="text-xs font-medium">No documents uploaded</p>
                  <p className="text-[0.6875rem] text-muted-foreground">
                    Upload contracts and IDs to complete the employee file.
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {documents.map((document) => (
                    <div
                      key={document.id}
                      className="flex items-center gap-3 py-2.5 first:pt-1 last:pb-1"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <FileText className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{document.name}</p>
                        <p className="text-[0.625rem] text-muted-foreground">
                          {humanize(document.category)} · {document.file_path}
                        </p>
                      </div>
                      {document.expires_on && (
                        <Badge variant="outline" className="hidden sm:inline-flex">
                          Expires {formatDate(document.expires_on)}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Download document"
                        onClick={async () => {
                          const result = await getEmployeeDocumentUrl(document.file_path)
                          if (!result.success) {
                            toast.add({ type: "error", title: "Download failed", description: result.error })
                            return
                          }
                          window.open(result.data.url, "_blank")
                        }}
                      >
                        <Download />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Delete document"
                        onClick={async () => {
                          if (!window.confirm(`Delete "${document.name}"?`)) return
                          const result = await deleteEmployeeDocument(document.id, employee.id, document.file_path)
                          if (!result.success) {
                            toast.add({ type: "error", title: "Delete failed", description: result.error })
                            return
                          }
                          toast.add({ type: "success", title: "Document deleted" })
                          router.refresh()
                        }}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
